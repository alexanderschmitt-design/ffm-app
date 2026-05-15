# Kalkulations-Quiz

Web-Quiz für den Management-Kongress der Kalkulations- und Steuerabteilung. Der Moderator führt 1–4 Spieler durch Multiple-Choice-Fragen (3 Antworten), Spieler scannen pro Frage einen QR-Code auf dem Beamer-Slide und antworten auf dem Handy. Auf dem Beamer läuft live ein spoilerfreier Eingangs-Counter, nach Auflösung wird die Antwortverteilung sichtbar.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Realtime) als Daten- und Live-Layer
- Admin-Login per Passwort (HMAC-Cookie)
- Deploy: Vercel

## Setup

1. **Supabase-Projekt anlegen** (https://supabase.com → New project).
2. SQL aus `supabase/migrations/0001_init.sql` im Supabase SQL-Editor ausführen. Optional `supabase/seed.sql` für Demo-Daten.
3. `.env.local` anlegen (Kopiervorlage in `.env.local.example`):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_PASSWORD=...
   ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

4. **Realtime aktivieren** (Supabase Dashboard → Database → Replication → `votes` Tabelle aktivieren). Die Migration setzt das bereits per `alter publication`.

5. Dev-Server:
   ```bash
   npm run dev
   ```

## User-Flows

| Wer            | Route                  | Was                                                                   |
|----------------|------------------------|-----------------------------------------------------------------------|
| Admin          | `/admin`               | Login, Spiele und Fragen anlegen, QR-Codes herunterladen              |
| Moderator      | `/present/[gameId]`    | Vollbild-Beamer-Ansicht, Tastatur: ←/→ Frage wechseln, Space auflösen |
| Spieler (Phone)| `/play/[slug]`         | QR-Ziel — Frage + 3 Buttons, Sofort-Feedback richtig/falsch           |

## Bedienung Beamer

- `←` / `→` oder `PageUp` / `PageDown`: Frage wechseln
- `Space` oder `Enter`: Auflösen (zeigt Verteilung + korrekte Antwort)
- Live-Counter "Antworten eingegangen: N" während Frage offen, **kein Spoiler** der Verteilung

## Vercel Deploy

- Env-Vars im Vercel-Dashboard setzen (alle aus `.env.local.example`)
- Standard Next.js Build, kein zusätzlicher Setup

## Architektur-Notizen

- Alle Schreibzugriffe laufen serverseitig mit Service-Role-Key (RLS umgangen, bewusst)
- Nur Realtime-Subscriptions nutzen den Anon-Key im Browser
- Mehrfach-Voting bewusst erlaubt (kein Cookie-Schutz im MVP)
- Fallback-Polling alle 2 s zusätzlich zu Realtime, falls WebSocket-Verbindung droppt
