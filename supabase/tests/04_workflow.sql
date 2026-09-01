-- Municipal workflow regression tests.
--
-- Every assertion here corresponds to a bug that reached the live system and
-- was only found by driving the deployed stack. None of them would have been
-- caught by reading the SQL.
--
-- Run: psql "$DATABASE_URL" -f supabase/tests/04_workflow.sql

begin;

create temp table results(check_name text, outcome text);
grant all on results to authenticated;

do $$
declare
  w24 bigint; c_id uuid; d double precision;
  si  uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  muq uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  wrk uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  cit uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  ok boolean;
begin
  select id into w24 from public.wards where year = 2022 and ward_no = 24;

  insert into auth.users (id, email, instance_id, aud, role) values
    (si, 'si@t.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (muq,'muq@t.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (wrk,'wrk@t.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (cit,'cit@t.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated');

  update public.profiles set role='si', ward_id=w24, identifier='SI1' where id=si;
  update public.profiles set role='muqaddam', ward_id=w24, si_identifier='SI1' where id=muq;
  update public.profiles set role='worker', ward_id=w24 where id=wrk;

  insert into public.complaints (citizen_id, image_path, lat, lng, ward_id,
    clean_street_probability, garbage_probability, not_street_probability, prediction)
  values (cit, cit || '/x.jpg', 18.51133, 73.92356, w24, 5, 95, 0, 'litter')
  returning id into c_id;

  ------------------------------------------------------------------
  -- cleanup_distance_m parameter shadowing.
  --
  -- Its parameters were once named lat/lng, which public.complaints also has
  -- as COLUMNS. The columns won inside the function body, so it measured the
  -- complaint's distance from itself and always returned 0 - making the 30m
  -- proximity gate inert. A cleanup photo taken in Mumbai, 126km away, was
  -- accepted and closed a Pune complaint.
  ------------------------------------------------------------------
  d := public.cleanup_distance_m(c_id, 18.51133, 73.92356);
  insert into results values ('distance on-site is ~0m',
    case when d < 5 then 'PASS' else format('FAIL: %s', d) end);

  d := public.cleanup_distance_m(c_id, 19.0760, 72.8777);
  insert into results values ('distance to Mumbai is not 0 (shadowing bug)',
    case when d > 100000 then 'PASS' else format('FAIL: %s - parameters are shadowed again', d) end);

  d := public.cleanup_distance_m(c_id, 18.51160, 73.92356);
  insert into results values ('distance ~30m north is just inside the gate',
    case when d between 25 and 35 then 'PASS' else format('FAIL: %s', d) end);

  ------------------------------------------------------------------
  -- Mutual RLS recursion between complaints and complaint_assignments.
  --
  -- complaints' worker-read policy queried complaint_assignments, whose own
  -- policy queried complaints, so assigning a worker failed with
  -- 42P17 "infinite recursion detected in policy". Both sides now go through
  -- SECURITY DEFINER helpers.
  ------------------------------------------------------------------
  update public.complaints
     set status='forwarded', assigned_muqaddam=muq where id=c_id;

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims',
    json_build_object('sub',muq,'role','authenticated')::text, true);

  ok := true;
  begin
    insert into public.complaint_assignments (complaint_id, worker_id, category)
    values (c_id, wrk, 'truck');
  exception when others then
    ok := false;
    insert into results values ('muqaddam can assign a worker (RLS recursion)',
      'FAIL: ' || sqlerrm);
  end;
  if ok then
    insert into results values ('muqaddam can assign a worker (RLS recursion)', 'PASS');
  end if;

  -- The worker can now see the complaint, and only through the assignment.
  perform set_config('request.jwt.claims',
    json_build_object('sub',wrk,'role','authenticated')::text, true);
  insert into results values ('assigned worker sees the complaint',
    case when (select count(*) from public.complaints where id=c_id) = 1
         then 'PASS' else 'FAIL' end);

  ------------------------------------------------------------------
  -- Self-demotion lockout: an admin could set their own role through
  -- /admin/users and lose access to the only screen that grants it back.
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub',si,'role','authenticated')::text, true);
  ok := false;
  begin
    update public.profiles set role='citizen' where id = si;
    ok := (select role from public.profiles where id=si) <> 'citizen';
  exception when others then ok := true;
  end;
  insert into results values ('nobody can change their own role',
    case when ok then 'PASS' else 'FAIL: self-demotion allowed' end);
end $$;

select check_name, outcome from results order by 1;

rollback;
