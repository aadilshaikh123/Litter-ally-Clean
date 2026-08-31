-- Two fixes.
--
-- 1. is_service_role() returned NULL rather than false when no JWT is present
--    (coalesce(null, null) = 'service_role' is null). It happened to fail
--    safe, but only by accident - any caller writing `if not is_service_role()`
--    would have got null and silently skipped its branch.
--
-- 2. Both guards blocked direct database access. PostgREST connects as the
--    `authenticator` role and then SET ROLEs to authenticated/anon/
--    service_role, so anything whose session_user is NOT authenticator is a
--    direct connection: the SQL editor, psql, or a migration. Those are
--    already superuser-level and must not be gated by an app-level trigger -
--    otherwise the documented bootstrap
--        update public.profiles set role='admin' where email='...';
--    fails, leaving no way to create the first admin at all.

create or replace function public.is_service_role()
returns boolean
language sql stable set search_path = ''
as $$
  -- Read the JWT claim directly. Inside a SECURITY DEFINER function
  -- current_user is the function owner, not the caller, so it cannot identify
  -- who is actually calling.
  select coalesce(
    coalesce(
      current_setting('request.jwt.claim.role', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    ) = 'service_role',
    false
  );
$$;

-- True for anything that is not an API request routed through PostgREST.
create or replace function public.is_direct_db_access()
returns boolean
language sql stable set search_path = ''
as $$
  select session_user <> 'authenticator';
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_direct_db_access()
     or public.is_service_role()
     or public.current_profile_role() = 'admin' then
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

create or replace function public.guard_complaint_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- service_role bypasses RLS but NOT triggers, so verify-cleanup needs this
  -- exemption to record its own verification.
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
        and p.role = 'muqaddam'
        and p.status = 'active'
        and p.ward_id = new.ward_id
    ) then
      raise exception 'assigned muqaddam must be an active muqaddam in the same ward'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
