import type { ClipScores } from "./thresholds.ts";

// The classifier is a Hugging Face ZeroGPU Gradio Space. HF gates every other
// compute Space behind a paid plan, and ZeroGPU only serves the Gradio graph -
// a mounted FastAPI route is never reached - so this talks to Gradio's HTTP
// API.
//
// This speaks that API with plain fetch rather than @gradio/client. The client
// connects fine under Deno but throws a bare `TypeError` from predict() inside
// the Supabase edge runtime, while the identical call works under Node. Three
// documented requests are easier to debug than a black box, and drop a
// dependency.
//
//   1. POST /gradio_api/upload            -> ["/tmp/gradio/<hash>/image.jpg"]
//   2. POST /gradio_api/call/predict      -> { event_id }
//   3. GET  /gradio_api/call/predict/<id> -> SSE: `event: complete` | `event: error`

const SPACE_ID = Deno.env.get("CLIP_SPACE_ID") ?? "Lucitrippin/litter-ally-clip";
const CLIP_SECRET = Deno.env.get("CLIP_SERVICE_SECRET") ?? "";
// Optional: attributes ZeroGPU quota to that account (5 min/day) instead of
// the unauthenticated pool (2 min/day).
const HF_TOKEN = Deno.env.get("HF_TOKEN");

/** owner/name -> https://owner-name.hf.space */
const BASE = Deno.env.get("CLIP_SPACE_URL") ??
  `https://${SPACE_ID.replace(/[/_.]/g, "-").toLowerCase()}.hf.space`;

// A slept Space rebuilds its container and re-pulls ~605MB of weights.
const TIMEOUT_MS = 180_000;

const authHeaders = (): HeadersInit =>
  HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

async function withTimeout(url: string, init: RequestInit, label: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw new Error(`${label}: ${String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Parse Gradio's SSE stream, returning the payload of the terminal event. */
function parseSse(raw: string): unknown {
  let event = "";
  let last: unknown;
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      const body = line.slice(5).trim();
      if (!body) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        continue;
      }
      if (event === "error") {
        const msg = (parsed as { error?: string })?.error ?? body;
        throw new Error(`CLIP Space returned an error: ${msg}`);
      }
      if (event === "complete") return parsed;
      last = parsed;
    }
  }
  if (last !== undefined) return last;
  throw new Error(`no terminal event in CLIP response: ${raw.slice(0, 300)}`);
}

export async function classify(blob: Blob): Promise<ClipScores> {
  // 1. Upload the image and get the server-side path.
  const form = new FormData();
  form.append("files", blob, "image.jpg");

  const up = await withTimeout(
    `${BASE}/gradio_api/upload`,
    { method: "POST", headers: authHeaders(), body: form },
    "CLIP upload",
  );
  if (!up.ok) {
    throw new Error(`CLIP upload failed (${up.status}): ${(await up.text()).slice(0, 200)}`);
  }
  const paths = await up.json() as string[];
  if (!Array.isArray(paths) || !paths[0]) {
    throw new Error(`CLIP upload returned no path: ${JSON.stringify(paths).slice(0, 200)}`);
  }

  // 2. Queue the prediction.
  const call = await withTimeout(
    `${BASE}/gradio_api/call/predict`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{ path: paths[0], meta: { _type: "gradio.FileData" } }, CLIP_SECRET],
      }),
    },
    "CLIP call",
  );
  if (!call.ok) {
    throw new Error(`CLIP call failed (${call.status}): ${(await call.text()).slice(0, 200)}`);
  }
  const { event_id } = await call.json() as { event_id?: string };
  if (!event_id) throw new Error("CLIP call returned no event_id");

  // 3. Await the result. The stream closes on `complete` or `error`, so
  //    reading it to the end is enough - no incremental parsing needed.
  const stream = await withTimeout(
    `${BASE}/gradio_api/call/predict/${event_id}`,
    { method: "GET", headers: authHeaders() },
    "CLIP result",
  );
  if (!stream.ok) {
    throw new Error(`CLIP result failed (${stream.status}): ${(await stream.text()).slice(0, 200)}`);
  }

  const payload = parseSse(await stream.text());

  // gr.api returns a single object, wrapped by Gradio in a one-element array.
  const scores = (Array.isArray(payload) ? payload[0] : payload) as ClipScores;
  if (!scores || typeof scores.garbage_probability !== "number") {
    throw new Error(`unexpected CLIP response: ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return scores;
}
