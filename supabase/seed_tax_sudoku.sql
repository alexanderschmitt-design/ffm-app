-- Tax Sudoku — FFM 2026 booth
-- Appends 8 playful multiple-choice questions to the existing
-- "FFM 2026" game (matched by name). Each question has exactly one
-- correct answer and two plausible distractors (typically off by a
-- factor of 10).
-- Source data: public/Sudoku Game.xlsx (CbCR table).
--
-- Idempotent: uses stable slugs with ON CONFLICT, safe to re-run.
-- Tip: re-run this after pulling the English UI translation to
-- replace the older German prompts/labels in the database.

do $$
declare
  v_game_id uuid;
  v_pos     int;
  v_q1 uuid; v_q2 uuid; v_q3 uuid; v_q4 uuid;
  v_q5 uuid; v_q6 uuid; v_q7 uuid; v_q8 uuid;
begin
  select id into v_game_id
  from public.games
  where name ilike '%FFM 2026%'
  order by created_at desc
  limit 1;

  if v_game_id is null then
    raise exception 'No FFM 2026 game found. Please create one in the admin area first.';
  end if;

  select coalesce(max(position), -1) + 1 into v_pos
  from public.questions where game_id = v_game_id;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-china-fte', v_pos,
     'China has 1.4 billion people. How many of them work full-time at Güntner China?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q1;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-usa-fte', v_pos + 1,
     'USA: land of opportunity, €89.6m in revenue. How many people pull that off at Güntner?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q2;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-mexico-rate', v_pos + 2,
     'Mexico: on every €100 of profit — how much does Güntner pay to Hacienda?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q3;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-romania-rate', v_pos + 3,
     'Romania — EU member, bargain corporate tax rate. What does Güntner pay to Bucharest?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q4;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-germany-revenue', v_pos + 4,
     'Germany — home turf. What is Güntner''s annual revenue here?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q5;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-uae-capital', v_pos + 5,
     'Dubai: skyscrapers, desert, share capital. What stated capital did Güntner start with in the UAE?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q6;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-indonesia-profit', v_pos + 6,
     'Indonesia: 17,000 islands, €102.5m in revenue. How much of that ends up as pre-tax profit?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q7;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-brazil-profit', v_pos + 7,
     'Brazil: carnival, caipirinha, calculations. At €21.5m revenue — how much pre-tax profit?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q8;

  delete from public.answer_options where question_id in
    (v_q1, v_q2, v_q3, v_q4, v_q5, v_q6, v_q7, v_q8);

  insert into public.answer_options (question_id, label, is_correct, position) values
    -- China FTE: 6
    (v_q1, '6',   true,  0),
    (v_q1, '60',  false, 1),
    (v_q1, '600', false, 2),

    -- USA FTE: 14
    (v_q2, '14',    true,  0),
    (v_q2, '140',   false, 1),
    (v_q2, '1,400', false, 2),

    -- Mexico tax rate: 30%
    (v_q3, '€17', false, 0),
    (v_q3, '€30', true,  1),
    (v_q3, '€45', false, 2),

    -- Romania tax rate: 16%
    (v_q4, '9%',  false, 0),
    (v_q4, '16%', true,  1),
    (v_q4, '25%', false, 2),

    -- Germany revenue: €359.5m
    (v_q5, '€35.9m',  false, 0),
    (v_q5, '€359.5m', true,  1),
    (v_q5, '€3.6bn',  false, 2),

    -- UAE stated capital: €20,000
    (v_q6, '€20,000',    true,  0),
    (v_q6, '€200,000',   false, 1),
    (v_q6, '€2,000,000', false, 2),

    -- Indonesia pre-tax profit: €4.6m
    (v_q7, '€460,000', false, 0),
    (v_q7, '€4.6m',    true,  1),
    (v_q7, '€46m',     false, 2),

    -- Brazil pre-tax profit: €690,000
    (v_q8, '€69,000',  false, 0),
    (v_q8, '€690,000', true,  1),
    (v_q8, '€6.9m',    false, 2);
end $$;
