-- ---------------------------------------------------------------------------
-- Row Level Security. This replaces authMiddleware.js, which did
-- authentication only - it had zero role checks, so any authenticated citizen
-- could call assignMuqaddam and mutate any complaint in the system by id.
--
-- Deny by default; every grant below is deliberate.
-- ---------------------------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.complaints            enable row level security;
alter table public.complaint_assignments enable row level security;
alter table public.wards                 enable row level security;
alter table public.zones                 enable row level security;

-- --- Reference geometry: readable by any signed-in user, writable by nobody
-- --- (seed migrations and the service role bypass RLS).
create policy wards_read on public.wards
  for select to authenticated using (true);
create policy zones_read on public.zones
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- Staff need to see the roster they assign work to.
create policy profiles_read_staff on public.profiles
  for select to authenticated
  using (public.current_profile_role() in ('si', 'dsi', 'csi', 'muqaddam', 'admin'));

-- A user may edit their own display fields only. role / status / ward_id /
-- identifier / si_identifier are locked by the trigger below - this is the
-- direct fix for registerCitizen taking `role` straight from the request body.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- RLS can gate which *rows* you may update but not which *columns*, so the
-- privilege fields are pinned here.
create function public.guard_profile_privileges()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- The service role bypasses RLS but still fires triggers, so it has to be
  -- exempted explicitly or server-side tooling cannot assign a staff role.
  if public.is_service_role() or public.current_profile_role() = 'admin' then
    return new;
  end if;
  if new.role          is distinct from old.role
  or new.status        is distinct from old.status
  or new.ward_id       is distinct from old.ward_id
  or new.identifier    is distinct from old.identifier
  or new.si_identifier is distinct from old.si_identifier then
    raise exception 'only an admin may change role, status, ward or identifiers'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute procedure public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- complaints
--
-- Note there is NO insert policy for any client role. Complaints can only be
-- created by the submit-report Edge Function using the service key, which is
-- what makes the CLIP garbage threshold impossible to bypass from a client.
-- ---------------------------------------------------------------------------

create policy complaints_read_own on public.complaints
  for select to authenticated using (citizen_id = (select auth.uid()));

create policy complaints_read_ward_staff on public.complaints
  for select to authenticated
  using (
    public.current_profile_role() in ('si', 'dsi', 'csi')
    and ward_id = public.current_profile_ward()
  );

create policy complaints_read_assigned_muqaddam on public.complaints
  for select to authenticated
  using (assigned_muqaddam = (select auth.uid()));

create policy complaints_read_assigned_worker on public.complaints
  for select to authenticated
  using (exists (
    select 1 from public.complaint_assignments a
    where a.complaint_id = complaints.id and a.worker_id = (select auth.uid())
  ));

create policy complaints_read_admin on public.complaints
  for select to authenticated using (public.current_profile_role() = 'admin');

-- An SI may triage complaints in their own ward, and only there.
create policy complaints_update_si on public.complaints
  for update to authenticated
  using (
    public.current_profile_role() in ('si', 'dsi', 'csi')
    and ward_id = public.current_profile_ward()
    and public.is_active()
  )
  with check (
    public.current_profile_role() in ('si', 'dsi', 'csi')
    and ward_id = public.current_profile_ward()
  );

create policy complaints_update_admin on public.complaints
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- Cleanup proof is written by the verify-cleanup Edge Function (service role),
-- never directly by the muqaddam - same reason as inserts.

-- ---------------------------------------------------------------------------
-- complaint_assignments
-- ---------------------------------------------------------------------------

create policy assignments_read_worker on public.complaint_assignments
  for select to authenticated using (worker_id = (select auth.uid()));

create policy assignments_read_staff on public.complaint_assignments
  for select to authenticated
  using (public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin'));

create policy assignments_write_muqaddam on public.complaint_assignments
  for insert to authenticated
  with check (
    public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin')
    and public.is_active()
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.assigned_muqaddam = (select auth.uid())
             or c.ward_id = public.current_profile_ward()
             or public.current_profile_role() = 'admin')
    )
  );

create policy assignments_delete_muqaddam on public.complaint_assignments
  for delete to authenticated
  using (
    public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin')
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.assigned_muqaddam = (select auth.uid())
             or c.ward_id = public.current_profile_ward()
             or public.current_profile_role() = 'admin')
    )
  );
