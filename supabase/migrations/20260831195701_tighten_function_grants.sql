-- Postgres grants EXECUTE on new functions to PUBLIC by default, which anon
-- and authenticated inherit - so revoking from those roles alone does nothing.
-- Every function in the `public` schema is otherwise reachable as an RPC
-- endpoint at /rest/v1/rpc/<name>.
--
-- Revoke from PUBLIC, then grant back only what is genuinely needed.
--
-- Which functions need which grant:
--   * The guard_* triggers are SECURITY DEFINER, so calls they make internally
--     run with the definer's privileges. Callers need nothing.
--   * RLS POLICY expressions are evaluated as the *invoking* role, so
--     `authenticated` does need EXECUTE on the helpers used inside policies.
--     Those four remain intentionally executable; each returns only the
--     caller's own row, keyed on auth.uid().

-- Unused: defined but referenced by no policy or query.
drop function if exists public.current_profile_identifier();

-- Trigger functions: invoked by the system, never by a caller.
revoke all on function public.handle_new_user()          from public, anon, authenticated;
revoke all on function public.touch_updated_at()         from public, anon, authenticated;
revoke all on function public.guard_profile_privileges() from public, anon, authenticated;
revoke all on function public.guard_complaint_columns()  from public, anon, authenticated;

-- Only ever called from inside the SECURITY DEFINER guards.
revoke all on function public.is_service_role()     from public, anon, authenticated;
revoke all on function public.is_direct_db_access() from public, anon, authenticated;

-- Operator/seed tooling, not part of the client API.
revoke all on function public.load_wards_geojson(jsonb, text, text, integer) from public, anon, authenticated;
revoke all on function public.load_real_zones(jsonb, integer, text, integer) from public, anon, authenticated;
revoke all on function public.generate_synthetic_zones(double precision)     from public, anon, authenticated;

-- Used inside RLS policies, so authenticated must be able to execute them.
revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.current_profile_ward() from public, anon;
revoke all on function public.is_active()            from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_ward() to authenticated;
grant execute on function public.is_active()            to authenticated;

-- Client-callable lookups.
revoke all on function public.active_ward_year() from public, anon;
revoke all on function public.lookup_location(double precision, double precision) from public, anon;
grant execute on function public.active_ward_year() to authenticated, service_role;
grant execute on function public.lookup_location(double precision, double precision)
  to authenticated, service_role;

-- Called by the verify-cleanup Edge Function only.
revoke all on function public.cleanup_distance_m(uuid, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.cleanup_distance_m(uuid, double precision, double precision)
  to service_role;
