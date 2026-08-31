-- ---------------------------------------------------------------------------
-- Ward and zone geometry. Replaces two module-level open(r"G:\...geojson")
-- calls in the Flask app that made it impossible to start anywhere but the
-- original author's machine.
-- ---------------------------------------------------------------------------

create table public.wards (
  id       bigint generated always as identity primary key,
  ward_no  integer not null,
  name     text    not null,
  year     integer not null default 2025,
  geom     extensions.geometry(MultiPolygon, 4326) not null,
  unique (ward_no, year)
);

create index wards_geom_idx on public.wards using gist (geom);
create index wards_year_idx on public.wards (year);

-- Muqaddam beats. is_synthetic marks generated placeholder boundaries so they
-- can never be mistaken for surveyed municipal data - real per-ward polygons
-- overwrite them one ward at a time.
create table public.zones (
  id           bigint generated always as identity primary key,
  ward_id      bigint not null references public.wards on delete cascade,
  code         text   not null unique,
  name         text   not null,
  is_synthetic boolean not null,
  geom         extensions.geometry(MultiPolygon, 4326) not null
);

create index zones_geom_idx on public.zones using gist (geom);
create index zones_ward_idx on public.zones (ward_id);

alter table public.profiles
  add constraint profiles_ward_fk foreign key (ward_id)
  references public.wards on delete set null;


-- ---------------------------------------------------------------------------
-- Which delimitation is live. Both 2022 (58 named wards) and 2025 (41 numbered
-- prabhags) are loaded; without this a point would match a ward in each.
-- Flip the row when the new delimitation takes effect.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                 boolean primary key default true check (id),
  active_ward_year   integer not null default 2022,
  updated_at         timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict do nothing;

create function public.active_ward_year()
returns integer language sql stable set search_path = '' as $$
  select active_ward_year from public.app_settings where id;
$$;

-- ---------------------------------------------------------------------------
-- Point lookup. With the GIST indexes this is an index seek, where the Flask
-- version iterated every polygon in Python on every single request.
-- ---------------------------------------------------------------------------
create function public.lookup_location(lat double precision, lng double precision)
returns table (
  ward_id           bigint,
  ward_no           integer,
  ward_name         text,
  zone_id           bigint,
  zone_code         text,
  zone_name         text,
  zone_is_synthetic boolean
)
language sql stable set search_path = ''
as $$
  with pt as (
    select extensions.st_setsrid(extensions.st_point(lng, lat), 4326) as g
  )
  select w.id, w.ward_no, w.name, z.id, z.code, z.name, z.is_synthetic
  from public.wards w
  cross join pt
  left join public.zones z
    on z.ward_id = w.id
   and extensions.st_contains(z.geom, pt.g)
  where w.year = public.active_ward_year()
    and extensions.st_contains(w.geom, pt.g)
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Bulk GeoJSON loader. Takes a whole FeatureCollection and the property names
-- to read, so the 2022 and 2025 PMC files (which differ) both load without a
-- code change.
-- ---------------------------------------------------------------------------
create function public.load_wards_geojson(
  fc          jsonb,
  name_prop   text,
  no_prop     text,
  target_year integer default 2022
)
returns integer
language plpgsql set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.wards (ward_no, name, year, geom)
  select
    (f -> 'properties' ->> no_prop)::integer,
    f -> 'properties' ->> name_prop,
    target_year,
    -- Force MultiPolygon: PMC files mix Polygon and MultiPolygon features.
    extensions.st_multi(
      extensions.st_makevalid(
        extensions.st_setsrid(extensions.st_geomfromgeojson(f ->> 'geometry'), 4326)
      )
    )
  from jsonb_array_elements(fc -> 'features') as f
  where f -> 'properties' ->> no_prop ~ '^[0-9]+$'
  on conflict (ward_no, year) do update
    set name = excluded.name, geom = excluded.geom;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Synthetic Muqaddam zones: tile each ward with a hex grid and clip to the
-- ward boundary. Deterministic, whole-city coverage, and every row is flagged.
-- 0.004 degrees is roughly 440m across - a plausible sanitation beat.
--
-- ponytail: hex tiling is a stand-in for real PMC sweeper beats, which are not
-- public data. Replace per ward via load_real_zones() as surveyed data arrives.
-- ---------------------------------------------------------------------------
create function public.generate_synthetic_zones(cell_size double precision default 0.004)
returns integer
language plpgsql set search_path = ''
as $$
declare
  inserted integer;
begin
  -- Only ever removes generated rows; real zones are never touched.
  delete from public.zones where is_synthetic;

  insert into public.zones (ward_id, code, name, is_synthetic, geom)
  select
    w.id,
    'SYNTH-W' || w.ward_no || '-M' || lpad(row_number() over (
      partition by w.id order by extensions.st_ymax(g.geom) desc, extensions.st_xmin(g.geom)
    )::text, 2, '0'),
    'Zone ' || w.name || ' #' || row_number() over (
      partition by w.id order by extensions.st_ymax(g.geom) desc, extensions.st_xmin(g.geom)
    ),
    true,
    -- CollectionExtract(...,3) keeps only the polygonal parts: a hex that
    -- merely grazes the ward edge can intersect as a point or line, which
    -- would not cast to MultiPolygon.
    extensions.st_multi(
      extensions.st_collectionextract(
        extensions.st_makevalid(extensions.st_intersection(g.geom, w.geom)), 3))
  from public.wards w
  cross join lateral extensions.st_hexagongrid(cell_size, w.geom) as g
  where w.year = public.active_ward_year()
    and extensions.st_intersects(g.geom, w.geom)
    -- Drop slivers where a hex only grazes the ward edge.
    and extensions.st_area(extensions.st_intersection(g.geom, w.geom))
        > extensions.st_area(g.geom) * 0.05
    -- A ward already covered by real zones keeps them; no synthetic overlay.
    and not exists (
      select 1 from public.zones z where z.ward_id = w.id and not z.is_synthetic
    );

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Load surveyed zone polygons for one ward, replacing that ward's synthetic
-- tiling. This is the path your real Bibvewadi data takes.
create function public.load_real_zones(
  fc         jsonb,
  target_ward integer,
  name_prop  text default 'Name',
  year_filter integer default null
)
returns integer
language plpgsql set search_path = ''
as $$
declare
  w_id     bigint;
  inserted integer;
begin
  select id into w_id from public.wards
   where ward_no = target_ward
     and year = coalesce(year_filter, public.active_ward_year());
  if w_id is null then
    raise exception 'ward % not found for year %', target_ward, year_filter;
  end if;

  delete from public.zones where ward_id = w_id;

  insert into public.zones (ward_id, code, name, is_synthetic, geom)
  select
    w_id,
    'W' || target_ward || '-' || (f -> 'properties' ->> name_prop),
    f -> 'properties' ->> name_prop,
    false,
    extensions.st_multi(
      extensions.st_collectionextract(
        extensions.st_makevalid(
          extensions.st_setsrid(extensions.st_geomfromgeojson(f ->> 'geometry'), 4326)
        ), 3)
    )
  from jsonb_array_elements(fc -> 'features') as f
  where f -> 'properties' ->> name_prop is not null
    and extensions.st_dimension(
          extensions.st_setsrid(extensions.st_geomfromgeojson(f ->> 'geometry'), 4326)) = 2;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
