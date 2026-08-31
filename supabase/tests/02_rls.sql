-- Authorization regression tests.
--
-- Each assertion below corresponds to a specific hole in the Express version:
--   * complaints_insert_denied  -> the CLIP threshold was enforced only in a
--     Node controller a client could simply not call.
--   * role_escalation_denied    -> registerCitizen took `role` from the request
--     body, and /api/govEmployees/register2 was public and unrestricted.
--   * cross_tenant_read_denied  -> no route had any role check, so any
--     authenticated citizen could read and mutate any complaint by id.
--
-- Run: psql "$DATABASE_URL" -f supabase/tests/02_rls.sql
begin;

-- Two citizens, created bypassing the auth trigger.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

update public.profiles set full_name = 'Citizen A'
 where id = '11111111-1111-1111-1111-111111111111';

insert into public.complaints
  (citizen_id, image_path, lat, lng,
   clean_street_probability, garbage_probability, not_street_probability, prediction)
values
  ('22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222/x.jpg',
   18.4640, 73.8637, 10, 85, 5, 'a street with garbage and litter');

-- Act as citizen A.
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare n integer; ok boolean;
begin
  -- 1. Cannot read another citizen's complaint.
  select count(*) into n from public.complaints;
  assert n = 0, format('cross-tenant read leaked %s rows', n);

  -- 2. Cannot insert a complaint directly - only the Edge Function may,
  --    which is what makes the CLIP threshold unbypassable.
  ok := false;
  begin
    insert into public.complaints
      (citizen_id, image_path, lat, lng,
       clean_street_probability, garbage_probability, not_street_probability, prediction)
    values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/y.jpg',
            18.46, 73.86, 99, 1, 0, 'a clean street with no garbage');
  exception when insufficient_privilege or others then ok := true;
  end;
  assert ok, 'a client was able to INSERT a complaint directly';

  -- 3. Cannot promote self to staff.
  ok := false;
  begin
    update public.profiles set role = 'si'
     where id = '11111111-1111-1111-1111-111111111111';
    -- The guard trigger raises; if it did not, verify nothing changed.
    if (select role from public.profiles
         where id = '11111111-1111-1111-1111-111111111111') = 'si' then
      ok := false;
    else
      ok := true;
    end if;
  exception when others then ok := true;
  end;
  assert ok, 'a citizen was able to escalate their own role';

  -- 4. May still edit their own display name.
  update public.profiles set full_name = 'Renamed'
   where id = '11111111-1111-1111-1111-111111111111';

  raise notice 'RLS tests passed';
end $$;

rollback;
