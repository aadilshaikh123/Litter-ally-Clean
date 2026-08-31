-- Supabase auto-enables RLS on newly created tables, which left app_settings
-- readable by nobody. active_ward_year() is SECURITY INVOKER and reads that
-- table, so for any signed-in caller it returned NULL - and lookup_location()
-- then matched no ward at all. Silently, with no error.
--
-- It only appeared to work because the Edge Functions call lookup_location
-- with the service role, which bypasses RLS. Any client-side call would have
-- reported "outside coverage" for every point in Pune.
--
-- Fixes: read the setting as definer, and expose the single settings row
-- read-only so the value is inspectable.

create or replace function public.active_ward_year()
returns integer
language sql stable security definer set search_path = ''
as $$
  select active_ward_year from public.app_settings where id;
$$;

create policy app_settings_read on public.app_settings
  for select to authenticated using (true);
