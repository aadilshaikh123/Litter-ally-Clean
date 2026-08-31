-- Ward boundary seed.
--
-- Source: PMC ward KML published on OpenCity (Public Domain), converted by
-- supabase/seed/kml_to_geojson.py and committed under supabase/seed/. Fetched
-- over HTTP rather than inlined, which keeps this migration readable instead
-- of a 400 KB blob of coordinates.
--
--   2022: 58 wards WITH names - matches the property names the old Flask code
--         read, and the era the Bibvewadi zone data was drawn in.
--   2025: 41 prabhags, numbers only - the published file carries no names.
--
-- Both load; app_settings.active_ward_year decides which is live.

create extension if not exists http with schema extensions;

select public.load_wards_geojson(
  (extensions.http_get('https://raw.githubusercontent.com/aadilshaikh123/Litter-ally-Clean/main/supabase/seed/pune-wards-2022.geojson')).content::jsonb,
  'ward_name', 'ward_no', 2022
);

select public.load_wards_geojson(
  (extensions.http_get('https://raw.githubusercontent.com/aadilshaikh123/Litter-ally-Clean/main/supabase/seed/pune-wards-2025.geojson')).content::jsonb,
  'ward_name', 'ward_no', 2025
);

-- Network access is only needed for this one-time load.
drop extension http;

do $$
declare n integer;
begin
  select count(*) into n from public.wards where year = public.active_ward_year();
  if n = 0 then
    raise exception 'no wards loaded for active year %', public.active_ward_year();
  end if;
  raise notice 'wards loaded: % for year %', n, public.active_ward_year();
end $$;
