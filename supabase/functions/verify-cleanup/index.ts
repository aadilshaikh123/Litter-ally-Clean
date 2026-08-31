// Muqaddam cleanup proof. Two independent gates: the photo must look clean,
// and it must have been taken near the original complaint.

import { adminClient, callerId, corsHeaders, json, ownsPath } from "../_shared/http.ts";
import { classify } from "../_shared/clip.ts";
import { CLEANUP_MAX_DISTANCE_M, CLEANUP_MAX_GARBAGE, isClean } from "../_shared/thresholds.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  const { complaint_id, storage_path, lat, lng } = await req.json().catch(() => ({}));
  if (typeof complaint_id !== "string" || typeof storage_path !== "string"
      || typeof lat !== "number" || typeof lng !== "number") {
    return json({ error: "complaint_id, storage_path, lat and lng are required" }, 400);
  }
  if (!ownsPath(storage_path, uid)) {
    return json({ error: "storage_path does not belong to you" }, 403);
  }

  const db = adminClient();

  // Only the assigned muqaddam may close a complaint. The old Node handler
  // took complaintId from the body with no ownership check at all, so any
  // authenticated user could close anyone's complaint.
  const { data: complaint } = await db
    .from("complaints")
    .select("id, assigned_muqaddam, status")
    .eq("id", complaint_id)
    .maybeSingle();

  if (!complaint) return json({ error: "complaint not found" }, 404);
  if (complaint.assigned_muqaddam !== uid) {
    return json({ error: "this complaint is not assigned to you" }, 403);
  }
  if (complaint.status === "completed") {
    return json({ error: "already completed" }, 409);
  }

  const { data: distance, error: distErr } = await db.rpc("cleanup_distance_m", {
    complaint: complaint_id, lat, lng,
  });
  if (distErr) return json({ error: "distance check failed", detail: distErr.message }, 500);

  const locationOk = distance !== null && distance <= CLEANUP_MAX_DISTANCE_M;

  const { data: blob, error: dlErr } = await db.storage
    .from("cleanup-proofs").download(storage_path);
  if (dlErr || !blob) return json({ error: "image not found in storage" }, 404);

  let scores;
  try {
    scores = await classify(blob);
  } catch (e) {
    return json({ error: "classifier unavailable, please retry", detail: String(e) }, 503);
  }

  const cleanOk = isClean(scores);

  if (!cleanOk || !locationOk) {
    await db.storage.from("cleanup-proofs").remove([storage_path]);
    return json({
      error: "verification_failed",
      message: !locationOk
        ? `Photo was taken ${Math.round(distance ?? 0)}m from the report; must be within ${CLEANUP_MAX_DISTANCE_M}m.`
        : `The area still looks littered (${scores.garbage_probability.toFixed(1)}%, need under ${CLEANUP_MAX_GARBAGE}%).`,
      location_verified: locationOk,
      clean_verified: cleanOk,
      distance_m: distance,
      scores,
    }, 422);
  }

  // These four fields are the ones Mongoose was silently dropping, because
  // none of them existed on the schema.
  const { data: updated, error: updErr } = await db
    .from("complaints")
    .update({
      status: "completed",
      post_cleaning_path: storage_path,
      cleanup_lat: lat,
      cleanup_lng: lng,
      cleanup_distance_m: distance,
      verification: { ...scores, distance_m: distance, verified_by: uid, verified_at: new Date().toISOString() },
      completed_at: new Date().toISOString(),
    })
    .eq("id", complaint_id)
    .select()
    .single();

  if (updErr) return json({ error: "could not save verification", detail: updErr.message }, 500);

  return json({ complaint: updated, distance_m: distance, scores });
});
