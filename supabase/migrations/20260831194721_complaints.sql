-- ---------------------------------------------------------------------------
-- Complaints. Two bugs from the Mongoose model are fixed here rather than
-- carried over:
--
--  1. `forwardedBySI` was queried in two places but was never a schema field,
--     so the SI "forwarded" view always returned empty. It is replaced by a
--     real 'forwarded' value on the status enum.
--  2. completeComplaint wrote muqaddamLocation / muqaddamLatitude /
--     muqaddamLongitude / muqaddamVerification, none of which existed on the
--     schema, so Mongoose strict mode silently dropped all four and the
--     cleanup evidence was never persisted. They are real columns below.
-- ---------------------------------------------------------------------------

create type public.complaint_status as enum
  ('pending', 'forwarded', 'in_progress', 'completed', 'rejected');

create table public.complaints (
  id            uuid primary key default extensions.uuid_generate_v4(),
  citizen_id    uuid not null references public.profiles on delete cascade,

  image_path    text not null,          -- storage key, not a URL
  description   text,

  lat           double precision not null,
  lng           double precision not null,
  -- Generated so it can never drift from lat/lng.
  geog          extensions.geography(Point, 4326)
                generated always as (extensions.st_point(lng, lat)::extensions.geography) stored,

  ward_id       bigint references public.wards on delete set null,
  zone_id       bigint references public.zones on delete set null,

  clean_street_probability numeric(5,2) not null,
  garbage_probability      numeric(5,2) not null,
  not_street_probability   numeric(5,2) not null,
  prediction               text         not null,

  status          public.complaint_status not null default 'pending',
  si_instructions text,
  assigned_muqaddam uuid references public.profiles on delete set null,

  -- Cleanup proof (the four fields Mongo was silently dropping).
  post_cleaning_path text,
  cleanup_lat        double precision,
  cleanup_lng        double precision,
  cleanup_distance_m double precision,
  verification       jsonb,
  completed_at       timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index complaints_citizen_idx   on public.complaints (citizen_id);
create index complaints_ward_status_idx on public.complaints (ward_id, status);
create index complaints_muqaddam_idx  on public.complaints (assigned_muqaddam);
create index complaints_geog_idx      on public.complaints using gist (geog);
create index complaints_created_idx   on public.complaints (created_at desc);

create trigger complaints_touch before update on public.complaints
  for each row execute procedure public.touch_updated_at();

-- Replaces the embedded workerAssignments[] array.
create table public.complaint_assignments (
  id           bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints on delete cascade,
  worker_id    uuid not null references public.profiles  on delete cascade,
  category     text,
  assigned_at  timestamptz not null default now(),
  unique (complaint_id, worker_id)
);

create index complaint_assignments_worker_idx on public.complaint_assignments (worker_id);

-- Distance between a complaint and a cleanup-proof photo. Used by the
-- verify-cleanup Edge Function; replaces geopy.geodesic in the Flask app.
create function public.cleanup_distance_m(
  complaint uuid, lat double precision, lng double precision
)
returns double precision
language sql stable set search_path = ''
as $$
  select extensions.st_distance(
           c.geog,
           extensions.st_point(lng, lat)::extensions.geography
         )
  from public.complaints c where c.id = complaint;
$$;
