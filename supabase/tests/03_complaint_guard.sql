-- Column-level guard on complaints.
--
-- RLS lets a supervisor update complaints in their own ward. These assertions
-- pin down what "update" is allowed to mean: triage fields yes, observed
-- evidence no.
--
-- Run: psql "$DATABASE_URL" -f supabase/tests/03_complaint_guard.sql
begin;

do $$
declare
  w_id       bigint;
  si_id      uuid := '33333333-3333-3333-3333-333333333333';
  muq_id     uuid := '44444444-4444-4444-4444-444444444444';
  outsider   uuid := '55555555-5555-5555-5555-555555555555';
  citizen    uuid := '66666666-6666-6666-6666-666666666666';
  other_ward bigint;
  c_id       uuid;
  ok         boolean;
begin
  select id into w_id from public.wards
   where year = public.active_ward_year() order by ward_no limit 1;
  select id into other_ward from public.wards
   where year = public.active_ward_year() and id <> w_id order by ward_no limit 1;
  assert w_id is not null, 'wards must be seeded before running this test';

  insert into auth.users (id, email) values
    (si_id, 'si@example.com'), (muq_id, 'muq@example.com'),
    (outsider, 'outsider@example.com'), (citizen, 'citizen@example.com');

  update public.profiles
     set role = 'si', ward_id = w_id, identifier = 'SI1', status = 'active'
   where id = si_id;
  update public.profiles
     set role = 'muqaddam', ward_id = w_id, si_identifier = 'SI1', status = 'active'
   where id = muq_id;
  -- A muqaddam in a different ward, to prove routing cannot leave the hierarchy.
  update public.profiles
     set role = 'muqaddam', ward_id = other_ward, si_identifier = 'SI9', status = 'active'
   where id = outsider;

  insert into public.complaints
    (citizen_id, image_path, lat, lng, ward_id,
     clean_street_probability, garbage_probability, not_street_probability, prediction)
  values
    (citizen, citizen || '/x.jpg', 18.4640, 73.8637, w_id,
     10, 85, 5, 'a street with garbage and litter')
  returning id into c_id;

  -- Act as the ward's SI.
  perform set_config('request.jwt.claim.sub', si_id::text, true);
  perform set_config('role', 'authenticated', true);

  -- 1. Triage is allowed.
  update public.complaints
     set status = 'forwarded', assigned_muqaddam = muq_id, si_instructions = 'Send a truck'
   where id = c_id;

  -- 2. Rewriting the classifier's own output is not.
  ok := false;
  begin
    update public.complaints set garbage_probability = 5 where id = c_id;
  exception when others then ok := true;
  end;
  assert ok, 'an SI was able to rewrite the classifier score';

  -- 3. Neither is moving the report or changing who filed it.
  ok := false;
  begin
    update public.complaints set lat = 0, lng = 0 where id = c_id;
  exception when others then ok := true;
  end;
  assert ok, 'an SI was able to move the complaint coordinates';

  ok := false;
  begin
    update public.complaints set citizen_id = si_id where id = c_id;
  exception when others then ok := true;
  end;
  assert ok, 'an SI was able to reassign the reporting citizen';

  -- 4. Nor forging the cleanup verification, which only the Edge Function writes.
  ok := false;
  begin
    update public.complaints
       set status = 'completed', completed_at = now(), verification = '{"faked":true}'::jsonb
     where id = c_id;
  exception when others then ok := true;
  end;
  assert ok, 'an SI was able to forge a cleanup verification';

  -- 5. Work cannot be routed to a muqaddam outside the ward.
  ok := false;
  begin
    update public.complaints set assigned_muqaddam = outsider where id = c_id;
  exception when others then ok := true;
  end;
  assert ok, 'a complaint was assigned to a muqaddam in another ward';

  raise notice 'complaint column guard tests passed';
end $$;

rollback;
