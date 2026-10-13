# 02 — Connected to Supabase

**What to build:** Connect the live app to the hosted Supabase project and read the documented outdoor spots from the `places` table. The table contains a UUID id, unique slug, name, coordinates, description, shade description, tree and seating flags, sun exposure, source URL, and verification date.

**Blocked by:** 01.

**Status:** todo

- [ ] Supabase URL and publishable key are configured locally and in Vercel; no secret or service-role key is used in the browser.
- [x] The `places` table is created with the agreed columns and seeded with three to five documented spots.
- [x] Row Level Security (RLS) is enabled and an explicit policy allows anonymous visitors to read spots.
- [x] Anonymous visitors cannot insert, update, or delete spot rows through the app's public credentials.
- [ ] The live app successfully reads and displays place names from the table.
- [ ] Works on the live URL.
