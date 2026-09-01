-- cleanup_distance_m always returned 0.
--
-- Its parameters were named `lat` and `lng`, and public.complaints has columns
-- with exactly those names. Inside the function body the COLUMN wins, so
--
--     extensions.st_point(lng, lat)
--
-- built a point from the complaint's own coordinates and measured its distance
-- from itself. Verified in practice: a cleanup photo taken in Mumbai, ~126km
-- from a Pune complaint, was accepted with distance_m = 0 and the complaint was
-- marked completed.
--
-- That made the 30m proximity gate inert - a muqaddam could close any complaint
-- assigned to them from anywhere.
--
-- Parameters are now prefixed so they cannot collide with a column name.
-- Parameter names cannot be changed by CREATE OR REPLACE, hence the DROP.

drop function if exists public.cleanup_distance_m(uuid, double precision, double precision);

create function public.cleanup_distance_m(
  p_complaint uuid, p_lat double precision, p_lng double precision
)
returns double precision
language sql stable set search_path = ''
as $$
  select extensions.st_distance(
           c.geog,
           extensions.st_point(p_lng, p_lat)::extensions.geography
         )
  from public.complaints c where c.id = p_complaint;
$$;

revoke all on function public.cleanup_distance_m(uuid, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.cleanup_distance_m(uuid, double precision, double precision)
  to service_role;
