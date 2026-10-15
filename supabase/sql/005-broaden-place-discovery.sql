-- Add two source-backed public places beyond plazas.
-- Run in Supabase Dashboard -> SQL Editor -> New query.

insert into public.places (
  slug,
  name,
  place_type,
  latitude,
  longitude,
  description,
  shade_description,
  has_trees,
  has_seating,
  sun_exposure,
  nearby_food_description,
  commute_cost_description,
  source_url,
  verified_at
)
values
  (
    'iloilo-river-esplanade',
    'Iloilo River Esplanade',
    'Riverside promenade',
    10.702015,
    122.544905,
    'A riverside path for outdoor activities. A published study documents a restaurant facing an Esplanade section; nearby choices can change.',
    null,
    null,
    null,
    null,
    'A restaurant is documented facing one Esplanade section; check current options.',
    null,
    'https://cids.up.edu.ph/wp-content/uploads/2026/03/Engaging-Stakeholders-in-River-Basin-Planning-and-Risk-Management.pdf',
    date '2026-10-15'
  ),
  (
    'garden-of-love',
    'Iloilo City Garden of Love',
    'Public garden',
    10.70234,
    122.56031,
    'A public flower garden in Nabitasan with a pond and garden seating; current features may have changed.',
    null,
    null,
    true,
    null,
    null,
    null,
    'https://www.iloilotoday.com/pond-at-garden-of-love/',
    date '2026-10-15'
  )
on conflict (slug) do update set
  name = excluded.name,
  place_type = excluded.place_type,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  description = excluded.description,
  shade_description = excluded.shade_description,
  has_trees = excluded.has_trees,
  has_seating = excluded.has_seating,
  sun_exposure = excluded.sun_exposure,
  nearby_food_description = excluded.nearby_food_description,
  commute_cost_description = excluded.commute_cost_description,
  source_url = excluded.source_url,
  verified_at = excluded.verified_at;

-- Preserve anonymous read-only access to the public catalog.
alter table public.places enable row level security;
revoke insert, update, delete on table public.places from anon, authenticated;
grant select on table public.places to anon, authenticated;

drop policy if exists "Anyone can read places" on public.places;
create policy "Anyone can read places"
  on public.places
  for select
  to anon, authenticated
  using (true);
