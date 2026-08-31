-- Authorization regression tests.
--
-- Each check corresponds to a specific hole in the Express version this
-- replaced:
--   * complaint INSERT   -> the CLIP threshold was enforced only in a Node
--     controller that a client could simply not call.
--   * role escalation    -> registerCitizen took `role` from the request body,
--     and /api/govEmployees/register2 was public and unrestricted.
--   * cross-tenant read  -> no route had any role check, so any authenticated
--     citizen could read and mutate any complaint by id.
--   * column guard       -> RLS gates rows, not columns; without the trigger an
--     SI could rewrite the classifier's own output.
--
-- Run against the live database:
--   psql "$DATABASE_URL" -f supabase/tests/02_security.sql
--
-- Note on is_direct_db_access(): the guards deliberately exempt direct
-- database connections, otherwise the first admin could never be created. psql
-- IS a direct connection, so the guard body would be skipped and these tests
-- would vacuously pass. The stub below forces the API code path. It is created
-- inside the transaction and disappears on rollback.

begin;

create temp table results(check_name text, outcome text);
grant all on results to authenticated;

-- ---- setup runs first, as a direct connection, with the real exemption ----
insert into auth.users (id, email, instance_id, aud, role) values
  ('11111111-1111-1111-1111-111111111111','a@example.com', '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('22222222-2222-2222-2222-222222222222','b@example.com', '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('33333333-3333-3333-3333-333333333333','si@example.com','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('44444444-4444-4444-4444-444444444444','m@example.com', '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('55555555-5555-5555-5555-555555555555','o@example.com', '00000000-0000-0000-0000-000000000000','authenticated','authenticated');

update public.profiles set role='si', identifier='SI1',
       ward_id=(select id from public.wards where year=2022 and ward_no=57)
 where id='33333333-3333-3333-3333-333333333333';
update public.profiles set role='muqaddam', si_identifier='SI1',
       ward_id=(select id from public.wards where year=2022 and ward_no=57)
 where id='44444444-4444-4444-4444-444444444444';
update public.profiles set role='muqaddam', si_identifier='SI9',
       ward_id=(select id from public.wards where year=2022 and ward_no=48)
 where id='55555555-5555-5555-5555-555555555555';

insert into public.complaints (id, citizen_id, image_path, lat, lng, ward_id,
  clean_street_probability, garbage_probability, not_street_probability, prediction)
values ('99999999-9999-9999-9999-999999999999','22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222/x.jpg', 18.4640, 73.8637,
  (select id from public.wards where year=2022 and ward_no=57),
  10, 85, 5, 'a street with garbage and litter');

-- Reaching this point proves the bootstrap path works: a direct connection CAN
-- assign a staff role, which is the only way to create the first admin.
insert into results values ('direct DB access can bootstrap a staff role', 'PASS');

-- ---- force the API code path for the remaining checks ----
create or replace function public.is_direct_db_access()
returns boolean language sql stable set search_path = '' as $$ select false $$;

set local role authenticated;

do $$
declare n integer; ok boolean;
begin
  ---------------------------------------------------------------- citizen A
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  insert into results values ('is_service_role() = false (not null) w/o service JWT',
    case when public.is_service_role() = false then 'PASS' else 'FAIL' end);

  select count(*) into n from public.complaints;
  insert into results values ('citizen cannot read another citizen''s complaint',
    case when n = 0 then 'PASS' else format('FAIL: leaked %s rows', n) end);

  ok := false;
  begin
    insert into public.complaints (citizen_id, image_path, lat, lng,
      clean_street_probability, garbage_probability, not_street_probability, prediction)
    values ('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111/y.jpg',
            18.46, 73.86, 99, 1, 0, 'a clean street with no garbage');
  exception when others then ok := true; end;
  insert into results values ('client cannot INSERT a complaint (CLIP gate)',
    case when ok then 'PASS' else 'FAIL: INSERT SUCCEEDED' end);

  ok := false;
  begin
    update public.profiles set role='si' where id='11111111-1111-1111-1111-111111111111';
    ok := (select role from public.profiles
            where id='11111111-1111-1111-1111-111111111111') <> 'si';
  exception when others then ok := true; end;
  insert into results values ('citizen cannot promote self to staff',
    case when ok then 'PASS' else 'FAIL: ESCALATED' end);

  update public.profiles set full_name='Renamed'
   where id='11111111-1111-1111-1111-111111111111';
  select count(*) into n from public.profiles
   where id='11111111-1111-1111-1111-111111111111' and full_name='Renamed';
  insert into results values ('citizen CAN edit own display name',
    case when n = 1 then 'PASS' else 'FAIL' end);

  ---------------------------------------------------------------- ward SI
  perform set_config('request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

  select count(*) into n from public.complaints;
  insert into results values ('SI sees complaints in own ward',
    case when n = 1 then 'PASS' else format('FAIL: saw %s', n) end);

  ok := true;
  begin
    update public.complaints
       set status='forwarded', assigned_muqaddam='44444444-4444-4444-4444-444444444444',
           si_instructions='Send a truck'
     where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := false; end;
  insert into results values ('SI CAN triage (status/instructions/assign)',
    case when ok then 'PASS' else 'FAIL: triage blocked' end);

  ok := false;
  begin update public.complaints set garbage_probability=5
         where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := true; end;
  insert into results values ('SI cannot rewrite classifier score',
    case when ok then 'PASS' else 'FAIL' end);

  ok := false;
  begin update public.complaints set lat=0, lng=0
         where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := true; end;
  insert into results values ('SI cannot move complaint coordinates',
    case when ok then 'PASS' else 'FAIL' end);

  ok := false;
  begin update public.complaints set citizen_id='33333333-3333-3333-3333-333333333333'
         where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := true; end;
  insert into results values ('SI cannot reassign reporting citizen',
    case when ok then 'PASS' else 'FAIL' end);

  ok := false;
  begin update public.complaints
           set status='completed', completed_at=now(), verification='{"faked":true}'::jsonb
         where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := true; end;
  insert into results values ('SI cannot forge cleanup verification',
    case when ok then 'PASS' else 'FAIL' end);

  ok := false;
  begin update public.complaints set assigned_muqaddam='55555555-5555-5555-5555-555555555555'
         where id='99999999-9999-9999-9999-999999999999';
  exception when others then ok := true; end;
  insert into results values ('cannot assign muqaddam from another ward',
    case when ok then 'PASS' else 'FAIL' end);

  ---------------------------------------------- function grants are tightened
  ok := false;
  begin perform public.is_service_role();
  exception when others then ok := true; end;
  insert into results values ('is_service_role() NOT callable over the API',
    case when ok then 'PASS' else 'FAIL: still callable' end);

  ok := false;
  begin perform public.generate_synthetic_zones();
  exception when others then ok := true; end;
  insert into results values ('generate_synthetic_zones() NOT callable over the API',
    case when ok then 'PASS' else 'FAIL: still callable' end);
end $$;

select check_name, outcome from results order by 1;

rollback;
