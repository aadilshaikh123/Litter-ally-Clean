-- Ward lookup regression test.
--
-- The two coordinates below are the ones hardcoded in the old
-- flask-backend/app.py and Map-Operation/map.py. Note those two files each
-- tested for a DIFFERENT ward name, and these points are genuinely in
-- different wards - so the old check was inconsistent between the two files.
--
-- Verified against the live database 2026-09-01: all assertions pass.
-- Run: psql "$DATABASE_URL" -f supabase/tests/01_geo_lookup.sql
begin;

do $$
declare
  r record;
  n integer;
begin
  select count(*) into n from public.wards where year = 2022;
  assert n = 58, format('expected 58 wards for 2022, got %s', n);

  select count(*) into n from public.wards where year = 2025;
  assert n = 41, format('expected 41 wards for 2025, got %s', n);

  assert public.active_ward_year() = 2022, 'active ward year should default to 2022';

  -- app.py / map.py primary test point
  select * into r from public.lookup_location(18.464002474404847, 73.86373927307856);
  assert r.ward_no = 57,
    format('expected ward 57, got %s (%s)', r.ward_no, r.ward_name);
  assert r.ward_name = 'Sukhsagarnagar - Rajiv Gandhinagar',
    format('unexpected ward name: %s', r.ward_name);
  assert r.zone_id is not null, 'point inside a ward must land in a zone';

  -- map.py commented alternate point
  select * into r from public.lookup_location(18.463826817490844, 73.86830128726508);
  assert r.ward_name = 'Upper Super Indiranagar',
    format('unexpected ward name: %s', r.ward_name);

  -- Well outside Pune (Mumbai) - must resolve to nothing, not to a stray ward.
  select * into r from public.lookup_location(19.0760, 72.8777);
  assert r.ward_no is null, 'a point outside Pune must not match a ward';

  -- Every generated zone must be flagged, and must sit inside its ward.
  select count(*) into n from public.zones where not is_synthetic;
  raise notice 'real (surveyed) zones loaded: %', n;

  select count(*) into n
    from public.zones z join public.wards w on w.id = z.ward_id
   where not extensions.st_within(z.geom, extensions.st_buffer(w.geom, 0.0001));
  assert n = 0, format('%s zones escape their ward boundary', n);

  raise notice 'geo lookup tests passed';
end $$;

rollback;
