import { Client } from "npm:@gradio/client@1.15.7";
import type { ClipScores } from "./thresholds.ts";

// The classifier is a Hugging Face ZeroGPU Gradio Space. HF gates every other
// compute Space behind a paid plan, and ZeroGPU only serves the Gradio graph -
// a mounted FastAPI route is never reached - so this talks to the Gradio
// endpoint rather than a plain POST /predict.
const SPACE_ID = Deno.env.get("CLIP_SPACE_ID") ?? "Lucitrippin/litter-ally-clip";
const CLIP_SECRET = Deno.env.get("CLIP_SERVICE_SECRET") ?? "";
// Optional: an HF token attributes GPU quota to that account (5 min/day)
// instead of the unauthenticated pool (2 min/day).
const HF_TOKEN = Deno.env.get("HF_TOKEN");

// A slept Space has to rebuild its container and re-pull ~605MB of weights.
const CONNECT_TIMEOUT_MS = 180_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function connect() {
  const opts = HF_TOKEN ? { hf_token: HF_TOKEN as `hf_${string}` } : undefined;
  return await withTimeout(Client.connect(SPACE_ID, opts), CONNECT_TIMEOUT_MS, "Space connect");
}

export async function classify(blob: Blob): Promise<ClipScores> {
  let client;
  try {
    client = await connect();
  } catch {
    // Cold start: the first attempt often lands while the Space is still
    // waking. One retry, by which point it is usually up.
    client = await connect();
  }

  const result = await withTimeout(
    client.predict("/predict", { image: blob, secret: CLIP_SECRET }),
    CONNECT_TIMEOUT_MS,
    "CLIP inference",
  );

  // Gradio wraps returns in a data array; our function returns a single object.
  const payload = (result as { data?: unknown[] }).data?.[0];
  if (!payload || typeof payload !== "object") {
    throw new Error(`unexpected CLIP response: ${JSON.stringify(result).slice(0, 300)}`);
  }

  const scores = payload as ClipScores;
  if (typeof scores.garbage_probability !== "number") {
    throw new Error(`CLIP response missing garbage_probability: ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return scores;
}
