-- Kongress-Quiz: initial schema
-- Anonymous voting, multiple votes allowed, swarm statistics aggregated server-side.

create extension if not exists "pgcrypto";

create table public.games (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  status               text not null default 'draft' check (status in ('draft','live','finished')),
  current_question_id  uuid,
  reveal_active        boolean not null default false,
  created_at           timestamptz not null default now()
);

create table public.questions (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  slug         text not null unique,
  position     int not null default 0,
  prompt       text not null,
  explanation  text,
  created_at   timestamptz not null default now()
);
create index questions_game_id_position_idx on public.questions(game_id, position);

create table public.answer_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false,
  position    int not null default 0
);
create index answer_options_question_id_idx on public.answer_options(question_id, position);

create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_id   uuid not null references public.answer_options(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index votes_question_id_idx on public.votes(question_id);

alter table public.games          enable row level security;
alter table public.questions      enable row level security;
alter table public.answer_options enable row level security;
alter table public.votes          enable row level security;

-- The app uses the service role on the server for all admin reads/writes,
-- which bypasses RLS. The anon key is only used for Realtime subscriptions.
-- For Realtime to deliver INSERT events on `votes`, the anon role needs SELECT
-- access on that table — but only on the row level changes, no historical reads.
create policy "votes read for realtime" on public.votes
  for select using (true);

-- Lookup a question + its 3 answer options by slug (used by /play/[slug])
create or replace function public.get_question_by_slug(p_slug text)
returns table (
  question_id   uuid,
  game_id       uuid,
  prompt        text,
  options_json  jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id   as question_id,
    q.game_id,
    q.prompt,
    coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id',         o.id,
                   'label',      o.label,
                   'position',   o.position,
                   'is_correct', o.is_correct
                 )
                 order by o.position
               )
        from public.answer_options o
        where o.question_id = q.id
      ),
      '[]'::jsonb
    ) as options_json
  from public.questions q
  where q.slug = p_slug
  limit 1;
$$;

revoke all on function public.get_question_by_slug(text) from public;
grant execute on function public.get_question_by_slug(text) to anon, authenticated, service_role;

-- Aggregate vote counts for a question (used by beamer reveal phase)
create or replace function public.get_vote_counts(p_question_id uuid)
returns table (option_id uuid, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.option_id, count(*)::bigint
  from public.votes v
  where v.question_id = p_question_id
  group by v.option_id;
$$;

revoke all on function public.get_vote_counts(uuid) from public;
grant execute on function public.get_vote_counts(uuid) to anon, authenticated, service_role;

-- Enable realtime broadcast on votes table
alter publication supabase_realtime add table public.votes;
