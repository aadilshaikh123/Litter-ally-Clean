// Every server call in the app. Replaces the old mix of axios and raw fetch
// against 11 hardcoded http://localhost:5000 URLs.

import { supabase } from "./supabase";

/** Upload an image under the caller's own prefix, which is the only place
 *  storage RLS lets them write. Returns the storage key. */
export async function uploadImage(bucket, file, userId) {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Signed URLs for private buckets, batched. Returns { path: url }. */
export async function signedUrls(bucket, paths, expiresIn = 3600) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error) return {};
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/** Call an Edge Function, surfacing its JSON error body rather than a bare
 *  "non-2xx status code", which is what supabase-js reports by default. */
async function invoke(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload.message || payload.error || `Request failed (${res.status})`);
    err.code = payload.error;
    err.details = payload;
    throw err;
  }
  return payload;
}

export const submitReport = (b) => invoke("submit-report", b);
export const verifyCleanup = (b) => invoke("verify-cleanup", b);

/* ------------------------------------------------------------- queries */

const COMPLAINT_COLS = `
  id, image_path, description, lat, lng, status, prediction,
  garbage_probability, clean_street_probability, si_instructions,
  assigned_muqaddam, post_cleaning_path, cleanup_distance_m,
  completed_at, created_at,
  ward:wards ( id, ward_no, name ),
  zone:zones ( id, code, name, is_synthetic )
`;

export const myReports = () =>
  supabase.from("complaints").select(COMPLAINT_COLS).order("created_at", { ascending: false });

/** RLS already scopes this to the caller's ward - no client-side ward filter
 *  is needed, and none would be trustworthy anyway. */
export const wardComplaints = (status) => {
  let q = supabase.from("complaints").select(COMPLAINT_COLS).order("created_at", { ascending: false });
  if (status) q = Array.isArray(status) ? q.in("status", status) : q.eq("status", status);
  return q;
};

/** Complaints assigned to this muqaddam.
 *
 *  The assigned_muqaddam filter is explicit and load-bearing. RLS grants read
 *  through several policies - own reports, assigned, ward staff, worker - so
 *  relying on it to scope this list surfaced complaints the muqaddam merely
 *  *filed*, which verify-cleanup then rightly refused with "this complaint is
 *  not assigned to you". RLS decides what may be read; the query decides what
 *  this screen is about. */
export const mukadamComplaints = (muqaddamId) =>
  supabase.from("complaints").select(COMPLAINT_COLS)
    .eq("assigned_muqaddam", muqaddamId)
    .neq("status", "completed")
    .order("created_at", { ascending: false });

/** Muqaddams for one ward, or every ward when wardId is null (admins have no
 *  ward of their own). ward_id is selected so the caller can narrow the list to
 *  a given complaint's ward - the database refuses an assignment across wards. */
export const mukadamRoster = (wardId) => {
  const q = supabase.from("profiles")
    .select("id, full_name, email, identifier, reports_to, ward_id")
    .eq("role", "mukadam").eq("status", "active");
  return wardId == null ? q : q.eq("ward_id", wardId);
};

export const sevakRoster = (wardId) =>
  supabase.from("profiles").select("id, full_name, email").eq("role", "safai_sevak").eq("ward_id", wardId);

export const forwardComplaint = (id, muqaddamId, instructions) =>
  supabase.from("complaints")
    .update({ assigned_muqaddam: muqaddamId, si_instructions: instructions, status: "forwarded" })
    .eq("id", id).select(COMPLAINT_COLS).single();

export const myTasks = () =>
  supabase.from("complaint_assignments")
    .select(`id, category, assigned_at, complaint:complaints ( ${COMPLAINT_COLS} )`)
    .order("assigned_at", { ascending: false });

export const assignWorker = (complaintId, workerId, category) =>
  supabase.from("complaint_assignments")
    .insert({ complaint_id: complaintId, worker_id: workerId, category }).select().single();

/* --------------------------------------------------------------- admin */

export const allProfiles = () =>
  supabase.from("profiles")
    .select("id, email, full_name, role, status, ward_id, identifier, reports_to, grade, created_at")
    .order("created_at", { ascending: false });

export const updateProfile = (id, patch) =>
  supabase.from("profiles").update(patch).eq("id", id).select().single();

export const listWards = () =>
  supabase.from("wards").select("id, ward_no, name").order("ward_no");
