-- Public read-only catalog for the Iloilo Outdoor Comfort Finder.
-- Run once in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  description text not null,
  shade_description text,
  has_trees boolean,
  has_seating boolean,
  sun_exposure text,
  source_url text not null,
  verified_at date not null default current_date
);

alter table public.places enable row level security;

revoke insert, update, delete on table public.places from anon, authenticated;
grant select on table public.places to anon, authenticated;

drop policy if exists "Anyone can read places" on public.places;
create policy "Anyone can read places"
  on public.places
  for select
  to anon, authenticated
  using (true);

-- These starter records identify public plazas. Amenity details are left
-- NULL until the team verifies them; NULL must be shown as "Not verified".
insert into public.places (
  slug, name, latitude, longitude, description, shade_description,
  has_trees, has_seating, sun_exposure, source_url, verified_at
)
values
  (
    'jaro-plaza',
    'Jaro Plaza',
    10.7244,
    122.55733,
    'Public plaza and recreation area in Jaro, Iloilo City. On-site comfort features still need verification.',
    null,
    null,
    null,
    null,
    'https://www.openstreetmap.org/way/142868946',
    current_date
  ),
  (
    'molo-plaza',
    'Molo Plaza',
    10.69694,
    122.54417,
    'Public plaza in Molo, Iloilo City. On-site comfort features still need verification.',
    null,
    null,
    null,
    null,
    'https://www.wikidata.org/wiki/Q124054259',
    current_date
  ),
  (
    'plaza-libertad',
    'Plaza Libertad',
    10.69264,
    122.57367,
    'Public plaza in Iloilo City Proper. On-site comfort features still need verification.',
    null,
    null,
    null,
    null,
    'https://www.openstreetmap.org/way/49424474',
    current_date
  )
on conflict (slug) do update set
  name = excluded.name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  description = excluded.description,
  shade_description = excluded.shade_description,
  has_trees = excluded.has_trees,
  has_seating = excluded.has_seating,
  sun_exposure = excluded.sun_exposure,
  source_url = excluded.source_url,
  verified_at = excluded.verified_at;
