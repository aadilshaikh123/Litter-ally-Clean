-- ---------------------------------------------------------------------------
-- Column guard for complaints.
--
-- RLS gates which ROWS a supervisor may update, but not which COLUMNS. Without
-- this an SI with a legitimate update grant on a complaint in their own ward
-- could rewrite the classifier scores, move the coordinates, or reassign the
-- complaint to a different citizen.
--
-- Triage fields (status, si_instructions, assigned_muqaddam) stay writable;
-- everything describing what was actually observed is server-owned. The
-- service role bypasses RLS and this trigger, so the Edge Functions can still
-- write the cleanup verification.
-- ---------------------------------------------------------------------------

create function public.guard_complaint_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Edge Functions run as service_role and are the only writer of evidence.
  if (select auth.role()) = 'service_role' then
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

  -- A complaint may only be handed to someone who is actually a muqaddam in
  -- the same ward, so triage cannot route work outside the hierarchy.
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

create trigger complaints_guard_columns
  before update on public.complaints
  for each row execute procedure public.guard_complaint_columns();
