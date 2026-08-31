-- ---------------------------------------------------------------------------
-- Identity. Replaces the two separate Mongo collections (User, GovEmployee)
-- that every login and every request had to probe in turn.
-- ---------------------------------------------------------------------------

create type public.user_role as enum
  ('citizen', 'worker', 'muqaddam', 'si', 'dsi', 'csi', 'admin');

create type public.user_status as enum ('pending', 'active', 'suspended');

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  full_name     text,
  avatar_url    text,
  role          public.user_role   not null default 'citizen',
  status        public.user_status not null default 'active',
  ward_id       bigint,          -- FK added in the geo migration
  identifier    text,            -- e.g. 'SI1'
  si_identifier text,            -- for muqaddams: which SI they report to
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx    on public.profiles (role);
create index profiles_ward_idx    on public.profiles (ward_id);
create index profiles_si_ident_idx on public.profiles (si_identifier);

-- Staff must carry the routing attributes their role is queried by; citizens
-- must not. Enforced here so a bad admin edit fails loudly instead of silently
-- producing a supervisor nobody's complaints can reach.
alter table public.profiles add constraint profiles_staff_attrs_ck check (
  case
    when role in ('si', 'dsi', 'csi') then ward_id is not null and identifier is not null
    when role = 'muqaddam'            then ward_id is not null and si_identifier is not null
    else true
  end
);

-- New staff sign in with Google and land as pending citizens; an admin
-- promotes them. There is deliberately no self-service path to a staff role -
-- that was the hole in the old public /api/govEmployees/register2 endpoint.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers used by every RLS policy.
-- Named current_profile_role, not current_role - the latter is a reserved
-- SQL keyword.
-- ---------------------------------------------------------------------------

create function public.current_profile_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function public.current_profile_ward()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select ward_id from public.profiles where id = (select auth.uid());
$$;

create function public.current_profile_identifier()
returns text
language sql stable security definer set search_path = ''
as $$
  select identifier from public.profiles where id = (select auth.uid());
$$;

create function public.is_active()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select status from public.profiles where id = (select auth.uid())) = 'active', false);
$$;
