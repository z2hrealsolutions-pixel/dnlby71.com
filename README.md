# DNL Admin — Setup & Deployment

## 1. Create your admin login

This app uses real Supabase Auth (email + password) — there's no public sign-up,
by design. Create your own account once:

Supabase Dashboard → Authentication → Users → Add User → enter your email and
a password. That's the login you'll use going forward.

## 2. Configure environment variables

```
cp .env.example .env
```

Fill in the two values from Supabase Dashboard → Project Settings → API:
- `VITE_SUPABASE_URL` — your Project URL
- `VITE_SUPABASE_ANON_KEY` — the "anon" / "publishable" key (NOT the service_role key)

## 3. Run locally

```
npm install
npm run dev
```

Opens at http://localhost:5173 — sign in with the account you created in step 1.

## 4. Deploy to Vercel

Push this folder to its own GitHub repo, then in Vercel:
- New Project → import that repo
- Framework Preset: Vite (should auto-detect)
- Add the same two environment variables from step 2 under
  Project Settings → Environment Variables
- Deploy

## What's built

- **Dashboard** — quick overview stats
- **Teams & Players** — add teams, manage 12-player rosters, capture DUPR ID
  (or email as a fallback, if a player doesn't have a DUPR ID yet)
- **Schedule** — one-click round-robin generator (15 group-stage face-offs
  for 6 teams), editable date/time/court per face-off
- **Lineups** — enter both teams' lineups (all 9 roles) before a face-off;
  automatically creates the underlying sub-matches the Referee Scoring App
  will score against
- **Standings & Scores** — live cumulative league table, plus two correction
  tools: editing an individual sub-match's score directly (for genuine
  mistakes — the total recalculates automatically), or an optional
  points-override per face-off for anything that isn't a scoring correction
  (forfeits, disciplinary decisions) — the override never erases the
  underlying match data, it just takes precedence when present
- **Knockout Stage** — staged IPL-style generation: Qualifier 1 and
  Eliminator get created together once the group stage is fully complete;
  Qualifier 2 only becomes available once both of those are actually
  finished (since it needs their real results); the Final becomes available
  once Qualifier 2 is done. Includes a manual winner override for the rare
  case of a genuine points tie.
- **Export to DUPR** — generates a CSV in DUPR's exact bulk-import format,
  per face-off, only including sub-matches that have actually been played.
  The upload step itself needs a browser (DUPR's mobile app doesn't support
  CSV import) — dashboard.dupr.com → your Club → Matches → Import Matches
  via CSV.

## Not built yet — the Referee Scoring App

This admin backend creates the schedule, lineups, and sub-match records —
but there's no way yet for a referee to actually enter a score during a
match. That's the next piece to build, as a genuinely separate app (same
reasoning as the rest of this system: a referee scoring a match shouldn't
also have the power to edit the schedule or override points).

## Not built yet — the Public Standings Platform

The suspense-building, no-login public page teams and players actually
watch. Comes after the Referee Scoring App, once there's real data flowing
through both to display.
