-- PostGIS backs the ward/zone point-in-polygon lookup that used to run as a
-- full linear scan over every polygon inside the Flask process.
create extension if not exists postgis with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
