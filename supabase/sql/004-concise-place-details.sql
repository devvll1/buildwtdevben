-- Add concise, optional place details for the visitor-facing catalog.
-- Run in Supabase Dashboard -> SQL Editor -> New query.

alter table public.places
  add column if not exists place_type text,
  add column if not exists nearby_food_description text,
  add column if not exists commute_cost_description text;

-- The current catalog contains public plazas. Leave nearby food and
-- commute cost NULL until reliable source information is available.
update public.places
set place_type = 'Public plaza'
where place_type is null
  and slug in ('jaro-plaza', 'molo-plaza', 'plaza-libertad');

-- Keep the public catalog readable, with no public write access.
alter table public.places enable row level security;
revoke insert, update, delete on table public.places from anon, authenticated;
grant select on table public.places to anon, authenticated;

drop policy if exists "Anyone can read places" on public.places;
create policy "Anyone can read places"
  on public.places
  for select
  to anon, authenticated
  using (true);
