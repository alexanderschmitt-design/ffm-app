-- Adds the second booth: Global Product Configuration (slug "gpc").
-- Idempotent via ON CONFLICT on the unique slug column.
-- Run once in the Supabase SQL editor.

insert into public.booths (slug, name, tagline) values
  ('gpc',
   'Product configuration FMM 2026',
   'Questions about configuration and product variations.')
on conflict (slug) do update
   set name    = excluded.name,
       tagline = excluded.tagline;
