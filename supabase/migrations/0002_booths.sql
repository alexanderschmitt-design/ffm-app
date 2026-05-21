-- Multi-booth support: each department gets its own landing page and admin.
-- Adds a booths table, links games to a booth, and seeds a default "tax"
-- booth for the existing FMM 2026 game(s).

create table public.booths (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text,
  created_at  timestamptz not null default now()
);

insert into public.booths (slug, name, tagline) values
  ('tax', 'Tax · FMM 2026', 'Eight playful questions about Güntner''s global numbers.');

alter table public.games add column booth_id uuid references public.booths(id);

-- Backfill: any pre-existing game gets attached to the default booth.
update public.games
   set booth_id = (select id from public.booths where slug = 'tax')
 where booth_id is null;

alter table public.games alter column booth_id set not null;

create index games_booth_id_idx on public.games(booth_id);

alter table public.booths enable row level security;
-- App reads booths via service-role on the server (RLS bypassed).
-- Anon needs read access so the public landing pages can list booths.
create policy "booths public read" on public.booths
  for select using (true);
