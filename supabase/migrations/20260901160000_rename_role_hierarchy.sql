-- ---------------------------------------------------------------------------
-- Align the role hierarchy with the real municipal chain, and collapse the
-- three inspector tiers that never actually differed.
--
--   Sanitary Inspector -> Mukadam -> Safai Karmachari
--
-- `si`, `dsi` and `csi` appeared ONLY as the group ('si','dsi','csi') in every
-- policy - never separately - so they were three names for one behaviour. They
-- collapse to `inspector`, with the old tier preserved in a display-only
-- `grade` column. No privilege is lost because none was ever attached.
--
-- `muqaddam` -> `mukadam`: the municipal spelling.
-- `worker`   -> `safai_sevak`: what the role is actually called.
-- `si_identifier` -> `reports_to`: it names the parent inspector, and "si"
-- stops meaning anything once that role is gone.
--
-- Postgres cannot remove a value from an enum, so the type is rebuilt. Every
-- policy and function naming a role has to be dropped first (they block the
-- column type change) and recreated afterwards. A policy dropped and not
-- recreated fails OPEN, so supabase/tests/02_security.sql must be re-run after
-- this migration.
-- ---------------------------------------------------------------------------

-- 1. Preserve the inspector tier before the values disappear.
alter table public.profiles add column if not exists grade text;

update public.profiles
   set grade = upper(role::text)
 where role::text in ('si', 'dsi', 'csi');

alter table public.profiles add constraint profiles_grade_ck
  check (grade is null or grade in ('SI', 'DSI', 'CSI'));

-- 2. Drop everything that depends on the enum.
drop policy profiles_read_staff         on public.profiles;
drop policy profiles_admin_all          on public.profiles;
drop policy complaints_read_ward_staff  on public.complaints;
drop policy complaints_read_admin       on public.complaints;
drop policy complaints_update_si        on public.complaints;
drop policy complaints_update_admin     on public.complaints;
drop policy assignments_read_staff      on public.complaint_assignments;
drop policy assignments_write_muqaddam  on public.complaint_assignments;
drop policy assignments_delete_muqaddam on public.complaint_assignments;
drop policy staff_read_images           on storage.objects;

drop function public.current_profile_role();

-- The column default is typed, so it blocks the type change too.
alter table public.profiles alter column role drop default;
alter table public.profiles drop constraint profiles_staff_attrs_ck;

-- 3. Swap the type.
create type public.user_role_v2 as enum
  ('citizen', 'safai_sevak', 'mukadam', 'inspector', 'admin');

alter table public.profiles
  alter column role type public.user_role_v2
  using (
    case role::text
      when 'si'       then 'inspector'
      when 'dsi'      then 'inspector'
      when 'csi'      then 'inspector'
      when 'muqaddam' then 'mukadam'
      when 'worker'   then 'safai_sevak'
      else role::text
    end
  )::public.user_role_v2;

drop type public.user_role;
alter type public.user_role_v2 rename to user_role;

alter table public.profiles
  alter column role set default 'citizen'::public.user_role;

-- 4. si_identifier names the parent inspector; rename it to match.
alter table public.profiles rename column si_identifier to reports_to;

-- 5. Restore the staff-attribute rule under the new names.
alter table public.profiles add constraint profiles_staff_attrs_ck check (
  case
    when role = 'inspector' then ward_id is not null and identifier is not null
    when role = 'mukadam'   then ward_id is not null and reports_to is not null
    else true
  end
);

-- 6. Recreate the role helper.
create function public.current_profile_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated;

-- 7. Recreate every policy, unchanged in meaning.
create policy profiles_read_staff on public.profiles
  for select to authenticated
  using (public.current_profile_role() in ('inspector', 'mukadam', 'admin'));

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

create policy complaints_read_ward_staff on public.complaints
  for select to authenticated
  using (
    public.current_profile_role() = 'inspector'
    and ward_id = public.current_profile_ward()
  );

create policy complaints_read_admin on public.complaints
  for select to authenticated using (public.current_profile_role() = 'admin');

create policy complaints_update_si on public.complaints
  for update to authenticated
  using (
    public.current_profile_role() = 'inspector'
    and ward_id = public.current_profile_ward()
    and public.is_active()
  )
  with check (
    public.current_profile_role() = 'inspector'
    and ward_id = public.current_profile_ward()
  );

create policy complaints_update_admin on public.complaints
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

create policy assignments_read_staff on public.complaint_assignments
  for select to authenticated
  using (public.current_profile_role() in ('mukadam', 'inspector', 'admin'));

create policy assignments_write_muqaddam on public.complaint_assignments
  for insert to authenticated
  with check (
    public.current_profile_role() in ('mukadam', 'inspector', 'admin')
    and public.is_active()
    and public.can_manage_complaint(complaint_id)
  );

create policy assignments_delete_muqaddam on public.complaint_assignments
  for delete to authenticated
  using (
    public.current_profile_role() in ('mukadam', 'inspector', 'admin')
    and public.can_manage_complaint(complaint_id)
  );

create policy staff_read_images on storage.objects
  for select to authenticated
  using (
    bucket_id in ('reports', 'cleanup-proofs')
    and public.current_profile_role() in ('mukadam', 'inspector', 'admin')
  );

-- 8. The complaint column guard names 'muqaddam' in its ward check.
create or replace function public.guard_complaint_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_direct_db_access() or public.is_service_role() then
    return new;
  end if;

  if new.id                       is distinct from old.id
  or new.citizen_id               is distinct from old.citizen_id
  or new.image_path               is distinct from old.image_path
  or new.lat                      is distinct from old.lat
  or new.lng                      is distinct from old.lng
  or new.ward_id                  is distinct from old.ward_id
  or new.zone_id                  is distinct from old.zone_id
  or new.clean_street_probability is distinct from old.clean_street_probability
  or new.garbage_probability      is distinct from old.garbage_probability
  or new.not_street_probability   is distinct from old.not_street_probability
  or new.prediction               is distinct from old.prediction
  or new.post_cleaning_path       is distinct from old.post_cleaning_path
  or new.cleanup_lat              is distinct from old.cleanup_lat
  or new.cleanup_lng              is distinct from old.cleanup_lng
  or new.cleanup_distance_m       is distinct from old.cleanup_distance_m
  or new.verification             is distinct from old.verification
  or new.completed_at             is distinct from old.completed_at
  then
    raise exception 'only triage fields (status, si_instructions, assigned_muqaddam) may be changed here'
      using errcode = '42501';
  end if;

  if new.assigned_muqaddam is distinct from old.assigned_muqaddam
     and new.assigned_muqaddam is not null then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.assigned_muqaddam
        and p.role = 'mukadam'
        and p.status = 'active'
        and p.ward_id = new.ward_id
    ) then
      raise exception 'assigned mukadam must be an active mukadam in the same ward'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_complaint_columns() from public, anon, authenticated;
