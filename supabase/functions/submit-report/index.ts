// The only path that can create a complaint.
//
// No client role has an INSERT policy on public.complaints, so the CLIP
// threshold below cannot be bypassed by talking to PostgREST directly.

import { adminClient, callerId, ownsPath, responder } from "../_shared/http.ts";
import { classify } from "../_shared/clip.ts";
import { REPORT_MIN_GARBAGE, isLitter } from "../_shared/thresholds.ts";

Deno.serve(async (req) => {
  // CORS is computed per request so the allowed origin can be echoed back.
  const { cors, json } = responder(req);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { storage_path, lat, lng, description } = await req.json().catch(() => ({}));

  if (typeof storage_path !== "string" || typeof lat !== "number" || typeof lng !== "number") {
    return json({ error: "storage_path, lat and lng are required" }, 400);
  }
  if (!ownsPath(storage_path, uid)) {
    return json({ error: "storage_path does not belong to you" }, 403);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json({ error: "coordinates out of range" }, 400);
  }

  const db = adminClient();

  const { data: blob, error: dlErr } = await db.storage.from("reports").download(storage_path);
  if (dlErr || !blob) return json({ error: "image not found in storage" }, 404);

  let scores;
  try {
    scores = await classify(blob);
  } catch (e) {
    // The image stays put - the client can retry without re-uploading.
    return json({ error: "classifier unavailable, please retry", detail: String(e) }, 503);
  }

  if (!isLitter(scores)) {
    // Reject and clean up, so a failed report leaves nothing behind.
    await db.storage.from("reports").remove([storage_path]);
    return json({
      error: "no_litter_detected",
      message: `This doesn't look like litter (${scores.garbage_probability.toFixed(1)}% confidence, need ${REPORT_MIN_GARBAGE}%). Try a closer photo of the rubbish itself.`,
      scores,
    }, 422);
  }

  const { data: loc } = await db.rpc("lookup_location", { lat, lng }).maybeSingle();

  const { data: complaint, error: insErr } = await db
    .from("complaints")
    .insert({
      citizen_id: uid,
      image_path: storage_path,
      description: typeof description === "string" ? description.slice(0, 2000) : null,
      lat,
      lng,
      ward_id: loc?.ward_id ?? null,
      zone_id: loc?.zone_id ?? null,
      clean_street_probability: scores.clean_street_probability,
      garbage_probability: scores.garbage_probability,
      not_street_probability: scores.not_street_probability,
      prediction: scores.prediction,
    })
    .select()
    .single();

  if (insErr) return json({ error: "could not save report", detail: insErr.message }, 500);

  return json({
    complaint,
    location: loc ?? null,
    // Surfaced so the UI can flag a generated zone rather than implying it is
    // a surveyed municipal boundary.
    zone_is_synthetic: loc?.zone_is_synthetic ?? null,
    outside_coverage: !loc,
  }, 201);
});
