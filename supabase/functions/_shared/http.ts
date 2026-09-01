import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Allowed browser origins, comma-separated. A `*.` prefix matches any HTTPS
// subdomain (e.g. `*.vercel.app` covers preview deployments). Leaving it unset
// falls back to `*`, so `supabase functions serve` still works locally.
//
// This is hygiene rather than a security boundary: every function already
// requires a valid JWT and checks storage-path ownership, so a permissive CORS
// header grants nothing on its own.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const originAllowed = (origin: string): boolean =>
  ALLOWED.some((rule) =>
    rule.startsWith("*.")
      ? origin.startsWith("https://") && origin.endsWith(rule.slice(1))
      : rule === origin
  );

/** CORS headers for one request. Echoes the origin only when it matches. */
export function corsFor(req: Request): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // Without this a shared cache could serve one origin's response to another.
    "Vary": "Origin",
  };
  if (ALLOWED.length === 0) return { ...base, "Access-Control-Allow-Origin": "*" };

  const origin = req.headers.get("Origin") ?? "";
  return originAllowed(origin)
    ? { ...base, "Access-Control-Allow-Origin": origin }
    : base; // no ACAO header => the browser blocks it
}

/** Per-request CORS headers plus a matching json() helper. */
export function responder(req: Request) {
  const cors = corsFor(req);
  return {
    cors,
    json: (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      }),
  };
}

/** Service-role client. Bypasses RLS - only ever used after an explicit
 *  ownership check in the handler. */
export const adminClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

/** Resolve the caller from their JWT. Returns null if unauthenticated. */
export async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const { data, error } = await createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  ).auth.getUser();

  return error ? null : data.user?.id ?? null;
}

/** The storage path must sit under the caller's own prefix.
 *  Without this a user could point the function at someone else's upload. */
export const ownsPath = (path: string, uid: string) => path.split("/")[0] === uid;
