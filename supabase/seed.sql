-- Example seed data: one demo game with three questions.
-- Run after migrations to have something to click around with locally.

insert into public.games (id, name, status)
values ('00000000-0000-0000-0000-000000000001', 'Kongress 2026 — Demo', 'draft');

with q as (
  insert into public.questions (id, game_id, slug, position, prompt) values
    ('11111111-1111-1111-1111-111111111111',
     '00000000-0000-0000-0000-000000000001',
     'demo-andorra-2m',
     0,
     'Ordne den Gewinn von 2.000.000 € dem richtigen Land zu.'),
    ('22222222-2222-2222-2222-222222222222',
     '00000000-0000-0000-0000-000000000001',
     'demo-ecuador-mitarbeiter',
     1,
     'Wie viele Mitarbeiter hatte Ecuador, um einen Gewinn von 300.000 € zu erzielen?'),
    ('33333333-3333-3333-3333-333333333333',
     '00000000-0000-0000-0000-000000000001',
     'demo-deutschland-marge',
     2,
     'Welche Bruttomarge erreicht der Standort Deutschland?')
  returning id
)
select 1 from q;

insert into public.answer_options (question_id, label, is_correct, position) values
  ('11111111-1111-1111-1111-111111111111', 'Andorra',     true,  0),
  ('11111111-1111-1111-1111-111111111111', 'Australien',  false, 1),
  ('11111111-1111-1111-1111-111111111111', 'Deutschland', false, 2),

  ('22222222-2222-2222-2222-222222222222', '12',  false, 0),
  ('22222222-2222-2222-2222-222222222222', '47',  true,  1),
  ('22222222-2222-2222-2222-222222222222', '320', false, 2),

  ('33333333-3333-3333-3333-333333333333', '8 %',  false, 0),
  ('33333333-3333-3333-3333-333333333333', '17 %', true,  1),
  ('33333333-3333-3333-3333-333333333333', '34 %', false, 2);
