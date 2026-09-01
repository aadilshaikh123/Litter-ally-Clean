-- An admin could change their own role through /admin/users and instantly lose
-- access to the only screen that can grant it back - a one-click, self-inflicted
-- lockout recoverable only with direct database access. It happened in
-- practice: the sole admin ended up back on `citizen`.
--
-- Direct DB access stays exempt (see is_direct_db_access), so the documented
-- bootstrap still works and a genuine lockout is still recoverable.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_direct_db_access() or public.is_service_role() then
    return new;
  end if;

  -- Nobody may change their own role or status, admins included.
  if new.id = (select auth.uid())
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'you cannot change your own role or status'
      using errcode = '42501';
  end if;

  if public.current_profile_role() = 'admin' then
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
