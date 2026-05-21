-- GPC (Global Product Configuration) booth — quiz questions.
-- Finds the newest game on the "gpc" booth and appends/updates 5 questions.
-- Idempotent via stable slugs + ON CONFLICT; safe to re-run.
--
-- Pre-req: the "gpc" booth must exist (supabase/seed_booth_gpc.sql)
-- and an admin must have created at least one game on it.
--
-- TODO: 3 more questions to reach 8 — waiting on real Güntner data.

do $$
declare
  v_game_id uuid;
  v_pos     int;
  v_q1 uuid; v_q2 uuid; v_q3 uuid;
  v_q4 uuid; v_q5 uuid;
begin
  select g.id into v_game_id
  from public.games g
  join public.booths b on b.id = g.booth_id
  where b.slug = 'gpc'
  order by g.created_at desc
  limit 1;

  if v_game_id is null then
    raise exception 'No game found for the "gpc" booth. Please create one in the admin area first.';
  end if;

  select coalesce(max(position), -1) + 1 into v_pos
  from public.questions where game_id = v_game_id;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'gpc-lines-of-code', v_pos,
     'GPC is a serious piece of software. How many lines of code does the Güntner Product Configurator run on?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q1;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'gpc-absolute-zero', v_pos + 1,
     'Refrigeration nerds know this one — 0 Kelvin, absolute zero. What is that in °C?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q2;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'gpc-fc-crossover', v_pos + 2,
     'There is exactly one temperature where the Fahrenheit and Celsius scales meet at the same number. Which is it?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q3;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'gpc-heaviest-kdb', v_pos + 3,
     'The biggest beast on Güntner''s KDB line — heaviest base unit, no accessories. How much does it weigh?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q4;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'gpc-cheapest-unit', v_pos + 4,
     'Entry-level Güntner. What is the lowest list price you can configure a Güntner unit for?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q5;

  delete from public.answer_options where question_id in
    (v_q1, v_q2, v_q3, v_q4, v_q5);

  insert into public.answer_options (question_id, label, is_correct, position) values
    -- GPC lines of code: 907,000
    (v_q1, '90,000',    false, 0),
    (v_q1, '907,000',   true,  1),
    (v_q1, '9,000,000', false, 2),

    -- Absolute zero: -273.15 °C
    (v_q2, '-100 °C',    false, 0),
    (v_q2, '-273.15 °C', true,  1),
    (v_q2, '-1,000 °C',  false, 2),

    -- Fahrenheit / Celsius crossover: -40°
    (v_q3, '0°',   false, 0),
    (v_q3, '-40°', true,  1),
    (v_q3, '40°',  false, 2),

    -- Heaviest KDB base unit: 7,089.8 kg
    (v_q4, '708.98 kg',  false, 0),
    (v_q4, '7,089.8 kg', true,  1),
    (v_q4, '70,898 kg',  false, 2),

    -- Cheapest list price: €626
    (v_q5, '€62.60', false, 0),
    (v_q5, '€626',   true,  1),
    (v_q5, '€6,260', false, 2);
end $$;
