import type { ClipScores } from "./thresholds.ts";

const CLIP_URL = Deno.env.get("CLIP_SERVICE_URL")!;
const CLIP_SECRET = Deno.env.get("CLIP_SERVICE_SECRET") ?? "";

// A sleeping HF Space takes ~40s to wake, so the first attempt gets a long
// budget and one retry rather than failing the user's report.
const WAKE_TIMEOUT_MS = 90_000;

async function post(blob: Blob, timeoutMs: number): Promise<Response> {
  const form = new FormData();
  form.append("image", blob, "image.jpg");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${CLIP_URL}/predict`, {
      method: "POST",
      headers: CLIP_SECRET ? { "X-Service-Secret": CLIP_SECRET } : {},
      body: form,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function classify(blob: Blob): Promise<ClipScores> {
  let res: Response;
  try {
    res = await post(blob, WAKE_TIMEOUT_MS);
  } catch {
    // Cold start or a dropped connection - one retry, the Space is awake now.
    res = await post(blob, WAKE_TIMEOUT_MS);
  }

  if (!res.ok) {
    throw new Error(`CLIP service returned ${res.status}: ${await res.text()}`);
  }
  return await res.json() as ClipScores;
}
