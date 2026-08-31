-- lpad TRUNCATES when the input is longer than the target width, so
-- lpad('100', 2, '0') = '10' - identical to row 10. Any ward with more than 99
-- hexes therefore produced duplicate zone codes and the insert aborted on the
-- unique constraint. One of the 58 wards has 118 hexes, so this fired on the
-- very first real seed.
--
-- greatest(3, length(...)) pads short numbers for tidy sorting while never
-- truncating long ones. The sequence is also computed once in a CTE instead of
-- twice in the select list.
create or replace function public.generate_synthetic_zones(cell_size double precision default 0.004)
returns integer
language plpgsql set search_path = ''
as $$
declare
  inserted integer;
begin
  -- Only ever removes generated rows; real zones are never touched.
  delete from public.zones where is_synthetic;

  with tiles as (
    select
      w.id      as ward_id,
      w.ward_no,
      w.name    as ward_name,
      row_number() over (
        partition by w.id
        order by extensions.st_ymax(g.geom) desc, extensions.st_xmin(g.geom)
      ) as seq,
      extensions.st_multi(
        extensions.st_collectionextract(
          extensions.st_makevalid(extensions.st_intersection(g.geom, w.geom)), 3)
      ) as geom
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
      )
  )
  insert into public.zones (ward_id, code, name, is_synthetic, geom)
  select
    ward_id,
    'SYNTH-W' || ward_no || '-M' || lpad(seq::text, greatest(3, length(seq::text)), '0'),
    'Zone ' || ward_name || ' #' || seq,
    true,
    geom
  from tiles
  where not extensions.st_isempty(geom);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Populate the zones for the active delimitation.
select public.generate_synthetic_zones();
