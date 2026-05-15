# Deploy zu GitHub + Vercel

Was bereits steht im lokalen Repo:

- `git init` + zwei Commits (`Initial commit from Create Next App`, `Add Kalkulations-Quiz MVP`)
- `.gitignore` schützt `.env.local`, lässt `.env.local.example` durch
- `next build` lokal grün, keine Lint-Fehler
- Branch: `master` (umbenennen siehe unten)

## 1) GitHub-Repo erstellen

### Variante A — über die Web-UI (kein Tool nötig)

1. https://github.com/new aufrufen
2. Repo-Name: z.B. `kalkulations-quiz` &middot; Visibility: **Private** (Empfehlung — interne Firmenzahlen)
3. **Kein** README/`.gitignore`/Lizenz hinzufügen (haben wir schon)
4. „Create repository"
5. GitHub zeigt dir auf der nächsten Seite "Push an existing repository". Im Projektverzeichnis ausführen:
   ```bash
   git branch -M main
   git remote add origin https://github.com/DEIN-USER/kalkulations-quiz.git
   git push -u origin main
   ```

### Variante B — über `gh` CLI

```powershell
winget install GitHub.cli   # UAC-Prompt akzeptieren
gh auth login               # interaktive Authentifizierung im Browser
git branch -M main
gh repo create kalkulations-quiz --private --source=. --remote=origin --push
```

## 2) Supabase-Projekt anlegen

1. https://supabase.com → New project
2. Region: `eu-central-1` (Frankfurt) für niedrige Latenz aus Deutschland
3. Datenbank-Passwort merken (für Settings, nicht für die App nötig)
4. Im Projekt → **SQL Editor** → New query → Inhalt von `supabase/migrations/0001_init.sql` einfügen → Run
5. Optional: `supabase/seed.sql` für Demo-Daten genauso ausführen
6. **Project Settings → API**: Folgendes notieren:
   - `Project URL`            → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` Key      → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret`  → `SUPABASE_SERVICE_ROLE_KEY` (nie ins Repo!)
7. **Database → Replication**: Tabelle `votes` muss in der `supabase_realtime` Publication sein (die Migration setzt das bereits — Häkchen nur kontrollieren).

## 3) Vercel-Projekt anlegen

1. https://vercel.com/new
2. „Import Git Repository" → GitHub authentifizieren falls noch nicht → das eben erstellte Repo auswählen
3. Framework Preset: Next.js (automatisch erkannt)
4. **Environment Variables** — alle vier Werte aus `.env.local.example` setzen:

   | Name                              | Beispielwert                            |
   |-----------------------------------|-----------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`        | `https://xyz.supabase.co`               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | `eyJhbGciOi...`                         |
   | `SUPABASE_SERVICE_ROLE_KEY`       | `eyJhbGciOi...` (geheim!)               |
   | `ADMIN_PASSWORD`                  | dein gewähltes Passwort                 |
   | `ADMIN_SESSION_SECRET`            | 64-Hex-Zeichen, siehe unten             |

   `ADMIN_SESSION_SECRET` lokal generieren und in Vercel einfügen:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. „Deploy". Erster Build dauert ca. 60–90 s.

## 4) Domain (optional)

Im Vercel-Projekt → Settings → Domains → eigene `*.vercel.app`-Subdomain wählen oder eigene Domain anhängen. Die `vercel.app`-URL reicht für den Kongress.

## 5) Smoke-Test nach Deploy

| URL                                    | Erwartung                                       |
|----------------------------------------|-------------------------------------------------|
| `https://DEINE-URL.vercel.app/`        | Landing-Page mit „Zum Admin-Bereich" Button     |
| `https://DEINE-URL.vercel.app/admin`   | Redirect auf `/admin/login`                     |
| nach Login → `/admin`                  | Spielliste, Button „Neues Spiel anlegen"        |
| Spiel + 1 Frage anlegen → „Beamer öffnen" | QR-Code sichtbar, Frage groß                 |
| QR mit Handy scannen → Antwort tippen  | Sofort richtig/falsch                           |
| Beamer „Auflösen"                      | Balkendiagramm faded ein, korrekte Antwort grün |

## Spätere Updates

Jeder `git push` auf `main` löst auf Vercel automatisch einen Production-Deploy aus. Für eine Vorschau:
```bash
git checkout -b feature/xyz
# ... Änderungen ...
git push -u origin feature/xyz
```
Vercel erstellt automatisch eine Preview-URL und postet sie als GitHub-Check.
