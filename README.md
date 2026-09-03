# DNL Public Platform — Setup & Deployment

## 1. Run the database migration first

`dnl_public_platform_functions.sql` (delivered alongside this app) must
run before anything here works — it adds the settings table, the four
public-safe read functions, and enables Realtime on the tables this app
needs to watch. Run it in Supabase's SQL Editor.

## 2. Configure environment variables

```
cp .env.example .env
```

Same Supabase project, same two values, as both other DNL apps.

## 3. Run locally

```
npm install
npm run dev
```

Resize your browser window to test both layouts — 900px wide and up shows
the TV layout, narrower shows the phone layout.

## 4. Deploy to Vercel

Push to its own new GitHub repo (fully separate from the other two apps,
per your call), then Vercel: New Project -> import -> Framework Preset:
Vite -> add the same two environment variables -> Deploy.

## How this actually works

**No login, fully public** — same security pattern as the Referee App:
zero direct table access. Every read goes through a function that
explicitly builds a safe response and simply never includes the referee
OTP anywhere in its output.

**Live updates via Supabase Realtime**, not polling — the instant a
referee saves a score anywhere, every connected screen (TV or phone,
anywhere in the world) refetches within a fraction of a second.

**Responsive by screen width**, not by device type — the same URL and the
same deployment serves both. 900px is the cutoff; a tablet in landscape
gets the TV layout, one in portrait gets the phone layout.

**TV layout**: three columns. Court N (left) and Court B (right) each show
the most recently completed sub-match on that court, with player names,
scores, and a winner highlight. The middle column shows either the live
standings table or the knockout bracket, controlled by a toggle in the
Admin Backend's Knockout page — never automatic, the admin decides when to
switch.

**Phone layout**: same three sections, stacked instead of side-by-side.
Tapping a court's card opens a full breakdown of that face-off's all 9
sub-matches with player names — the same underlying data as the TV, just
reached through a tap instead of shown inline, since a phone screen can't
show as much at once.

**The bracket** is custom-built (SVG connector lines + Framer Motion),
matching the IPL-style qualifier/eliminator/qualifier-2/final shape:
Qualifier 1's winner has a direct line straight to the Final, while
everyone else's path runs through Eliminator and Qualifier 2. Team names
turn green once a winner is decided — either because the points make it
obvious, or because the admin resolved a genuine tie manually.

## What to double check once this is actually live

I built and verified this against the real schema and confirmed the logic
carefully, but never against your live Supabase data with real matches
being scored — please do a real end-to-end test (score a sub-match from
the Referee App, confirm it appears within a second or two on both a TV-
width browser window and a phone) before trusting this for the actual
event.
