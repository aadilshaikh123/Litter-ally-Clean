import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Fail loudly at boot rather than with confusing 401s later.
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to client/.env.local.",
  );
}

// The anon key is safe to ship: every table is protected by RLS.
// Session persistence is handled here, which is why there is no manual
// localStorage token juggling anywhere in this app any more.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
