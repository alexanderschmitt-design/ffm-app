-- Tax Sudoku — FFM 2026 Marktstand
-- Hängt 8 spielerische Multiple-Choice-Fragen ans vorhandene
-- "FFM 2026"-Spiel an (gefunden per Name). Jede Frage hat genau eine
-- richtige Antwort + zwei plausible Ablenker (meist Faktor 10 daneben).
-- Quelle der Werte: public/Sudoku Game.xlsx (CbCR-Tabelle).
--
-- Idempotent: nutzt feste Slugs mit ON CONFLICT, kann also gefahrlos
-- erneut ausgeführt werden.

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
    raise exception 'Kein FFM-2026-Spiel gefunden. Bitte zuerst im Admin anlegen.';
  end if;

  select coalesce(max(position), -1) + 1 into v_pos
  from public.questions where game_id = v_game_id;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-china-fte', v_pos,
     'China hat 1,4 Milliarden Einwohner. Wie viele davon arbeiten Vollzeit bei Güntner China?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q1;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-usa-fte', v_pos + 1,
     'USA: Land der unbegrenzten Möglichkeiten und 89,6 Mio. € Umsatz. Mit wie vielen Köpfen wuppt Güntner das?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q2;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-mexico-rate', v_pos + 2,
     'Mexiko: Auf jeden 100-€-Gewinn — wie viel überweist Güntner an die Hacienda?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q3;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-romania-rate', v_pos + 3,
     'Rumänien — EU-Mitglied mit Spar-Steuersatz. Was zahlt Güntner an Bukarest?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q4;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-germany-revenue', v_pos + 4,
     'Deutschland — Heimspiel. Wie viel Umsatz fährt Güntner hier pro Jahr ein?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q5;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-uae-capital', v_pos + 5,
     'Dubai: Wolkenkratzer, Wüste, Werte. Mit welchem Stammkapital startet Güntner in den VAE?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q6;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-indonesia-profit', v_pos + 6,
     'Indonesien: 17.000 Inseln, 102,5 Mio. € Umsatz. Wie viel bleibt davon vor Steuern hängen?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q7;

  insert into public.questions (game_id, slug, position, prompt) values
    (v_game_id, 'tax-brazil-profit', v_pos + 7,
     'Brasilien: Karneval, Caipirinha, Kalkulation. Bei 21,5 Mio. € Umsatz — wie viel Gewinn vor Steuern?')
  on conflict (slug) do update set prompt = excluded.prompt, position = excluded.position
  returning id into v_q8;

  -- Bei Re-Run: alte Antwortoptionen wegräumen, dann neu setzen.
  delete from public.answer_options where question_id in
    (v_q1, v_q2, v_q3, v_q4, v_q5, v_q6, v_q7, v_q8);

  insert into public.answer_options (question_id, label, is_correct, position) values
    (v_q1, '6',    true,  0),
    (v_q1, '60',   false, 1),
    (v_q1, '600',  false, 2),

    (v_q2, '14',    true,  0),
    (v_q2, '140',   false, 1),
    (v_q2, '1.400', false, 2),

    (v_q3, '17 €', false, 0),
    (v_q3, '30 €', true,  1),
    (v_q3, '45 €', false, 2),

    (v_q4, '9 %',  false, 0),
    (v_q4, '16 %', true,  1),
    (v_q4, '25 %', false, 2),

    (v_q5, '35,9 Mio. €',  false, 0),
    (v_q5, '359,5 Mio. €', true,  1),
    (v_q5, '3,6 Mrd. €',   false, 2),

    (v_q6, '20.000 €',    true,  0),
    (v_q6, '200.000 €',   false, 1),
    (v_q6, '2.000.000 €', false, 2),

    (v_q7, '460.000 €',  false, 0),
    (v_q7, '4,6 Mio. €', true,  1),
    (v_q7, '46 Mio. €',  false, 2),

    (v_q8, '69.000 €',   false, 0),
    (v_q8, '690.000 €',  true,  1),
    (v_q8, '6,9 Mio. €', false, 2);
end $$;
