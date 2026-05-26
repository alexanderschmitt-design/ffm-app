-- Optional category tag for questions. Currently used only by the GPC booth
-- to tag questions with stages from the product configuration workflow
-- (CAD Design, Articles/Items, Product Knowledge & Rules, Sales/Production
-- Configuration, CAD Configuration). Tax booth questions leave it null.

alter table public.questions
  add column if not exists category text;
