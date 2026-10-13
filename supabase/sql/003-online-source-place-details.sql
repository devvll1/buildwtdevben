-- Provisional place features based on published online sources.
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- These are source-reported details, not recent on-site verification.

update public.places
set
  description = 'Historic public plaza in Jaro. A 2019 urban-park inventory documented trees; current features may have changed since later plaza rehabilitation.',
  shade_description = null,
  has_trees = true,
  has_seating = null,
  sun_exposure = null,
  source_url = 'https://www.pssnonline.org/wp-content/uploads/2019/10/iconsie-2019_proceedings.pdf',
  verified_at = current_date
where slug = 'jaro-plaza';

update public.places
set
  description = 'Public plaza with gardens. A 2020 University of the Philippines Visayas study describes trees shading benches; details are based on published research and may have changed.',
  shade_description = 'Tree shade over benches reported in the study; current coverage may vary.',
  has_trees = true,
  has_seating = true,
  sun_exposure = null,
  source_url = 'https://pjssh.upv.edu.ph/wp-content/uploads/2021/10/09b_25-18-44-PJSSH-20-19-10_Istorya-sa-plaza-Communication-context_Parcon-J..pdf',
  verified_at = current_date
where slug = 'molo-plaza';

update public.places
set
  description = 'Historic public plaza. A 2020 University of the Philippines Visayas study reports trees and benches, including shaded seating; details are based on published research and may have changed.',
  shade_description = 'Tree shade over benches reported in the study; current coverage may vary.',
  has_trees = true,
  has_seating = true,
  sun_exposure = null,
  source_url = 'https://pjssh.upv.edu.ph/wp-content/uploads/2021/10/09b_25-18-44-PJSSH-20-19-10_Istorya-sa-plaza-Communication-context_Parcon-J..pdf',
  verified_at = current_date
where slug = 'plaza-libertad';
