-- Bild-Upload pro Frage: nullable Spalte + öffentlich lesbarer Storage-Bucket.
-- Schreiben/Löschen läuft serverseitig mit Service-Role (RLS-bypass), daher keine Storage-Policies.

alter table public.questions
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;
