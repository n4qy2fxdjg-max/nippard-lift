# NADIR

**The quiz where the rarest right answer wins.**

NADIR is an original, broadcast-style quiz game for groups in the same room. Every question was
put to 100 people. Give a correct answer and you score the number of people who said the same
thing. **Lower is better.** A correct answer that nobody in the survey gave is a **Ghost Answer**:
it scores 0, adds to the jackpot, and in the Final it wins the lot.

One laptop or tablet runs the **host desk**, a TV or projector shows the **display**, and each
team's phone becomes a **controller**. All three stay in sync in real time.

> This project lives in the `nadir/` folder of the repository and is self-contained
> (its own `package.json`, database and tests).

---

## Contents

1. [How the game works](#how-the-game-works)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Database setup](#database-setup)
5. [Development commands](#development-commands)
6. [Hosting a game](#hosting-a-game)
7. [How phones join](#how-phones-join)
8. [Creating questions](#creating-questions)
9. [How surveys work](#how-surveys-work)
10. [Sound and animation](#sound-and-animation)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Environment variables](#environment-variables)
14. [Project structure](#project-structure)
15. [Roadmap hooks](#roadmap-hooks)

---

## How the game works

| Stage | What happens |
|---|---|
| **Elimination rounds** | Every remaining team answers each pass. Scores accumulate across the passes of a round; the team with the **highest** round total is eliminated. Ties are settled with a fresh tie-break question played only by the tied teams. |
| **Head-to-Head** | The last two teams play best-of-three (configurable). Both answer each question; the lower score takes the point. The team with the better elimination total chooses who answers first; turns alternate. |
| **The Final** | The winning team picks one of several categories, sees 3–5 prompts, has 60 seconds to confer and submits three answers. They are revealed one at a time. **One Ghost Answer wins the jackpot.** |
| **Jackpot** | Starts at £1,000 (configurable, any currency). Every Ghost Answer before the Final adds £250. A lost Final rolls the jackpot into the next game plus £1,000; a won Final resets it. The bank is kept per currency between games. |

Six question formats are implemented: **Open answer**, **Possible answers board**, **Clues &
answers**, **Linked categories**, **Picture board** and **Partial / scrambled answers**.

### Original terminology and identity

| Concept | NADIR term |
|---|---|
| Game title | **NADIR** (the lowest point) |
| Zero-score answer | **Ghost Answer** |
| Visual theme | "Midnight Observatory": deep navy, brass accent for the jackpot and Ghost Answers, cool cyan for data, rose for elimination. Display serif (Fraunces) + geometric sans (Manrope). |

The mechanics are inspired by the obscure-answer quiz genre but the name, look, sound, copy and
sample content are original.

---

## Architecture

```
Browser (host / display / phone)
   │  fetch role-scoped view            ▲ Server-Sent Events: { version }
   ▼                                    │ (polling fallback)
Next.js App Router (API routes) ────────┘
   │  applyAction(gameId, action, actor)
   ▼
Game service  ── per-game mutex, optimistic version check, undo snapshots
   │
   ├── Game engine  (pure reducer: reduce(state, action, ctx) → state)
   ├── Scoring      (pure functions, unit tested)
   ├── Matching     (normalisation + conservative fuzzy matching)
   └── Prisma       (SQLite locally, PostgreSQL in production)
```

**Key decisions**

* **Authoritative state lives on the server.** The whole `GameState` (including every hidden
  score) is stored as a snapshot in the `Game` row. Clients only ever receive a projection for
  their role (`projectDisplay`, `projectHost`, `projectTeam`), so a contestant inspecting the
  network tab cannot see scores, aliases or other teams' answers before the reveal.
* **A real state machine.** `lib/game-engine/engine.ts` is a deterministic reducer with explicit
  phases (`LOBBY → INTRO → … → FINAL_REVEAL → VICTORY/DEFEAT → GAME_OVER`). `ADVANCE` is the
  "do the next sensible thing" action behind the host's Space bar.
* **Undo via snapshots.** Every undoable action stores the pre-action state in `GameEvent`.
  Undo restores it and records an `UNDO` event, so the audit trail is intact.
* **Realtime without a socket server.** Each change bumps the game version and publishes to an
  in-process bus; `/api/games/[id]/stream` streams versions over SSE and clients re-fetch their
  view. When SSE is unavailable the client polls. Swap the bus for Pusher/Ably/Supabase for
  multi-instance hosting.
* **Resumable animations.** Reveal animations are a function of the server timestamp at which
  the reveal started, so a refreshed display re-joins mid-count instead of restarting.

---

## Installation

Requirements: Node.js 20.11+ (22 recommended) and npm.

```bash
cd nadir
npm install            # also runs `prisma generate`
cp .env.example .env   # defaults to a local SQLite file
npx prisma migrate dev # creates prisma/dev.db and applies migrations
npm run db:seed        # loads 28 sample questions, 5 final categories and the jackpot bank
npm run dev            # http://localhost:3000
```

---

## Database setup

The Prisma schema is written to be portable: enums and JSON documents are stored as strings so
the same schema works on SQLite and PostgreSQL.

**Local (default):** SQLite via `@prisma/adapter-better-sqlite3`, `DATABASE_URL="file:./prisma/dev.db"`.

**Production (PostgreSQL):**

```bash
npm run db:provider:postgres                       # sets provider = "postgresql" in the schema
export DATABASE_URL="postgresql://user:pass@host:5432/nadir?sslmode=require"
npx prisma migrate dev --name init-postgres        # once, to generate Postgres migrations
npx prisma migrate deploy                          # on every deploy
npm run db:seed                                    # optional sample content
```

Useful scripts: `db:migrate`, `db:deploy`, `db:push`, `db:reset`, `db:studio`.

---

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (engine, scoring, matching) |
| `npm run test:e2e` | Playwright end-to-end tests (starts the dev server if needed) |
| `npm run db:seed` | Seed sample content (idempotent) |

---

## Hosting a game

1. Open **/host** (the dashboard) → **New game**. The 8-step wizard asks for the game name,
   currency, jackpot, teams (2–8), players (1–4 per team), round structure, question selection
   (**Manual**, **Random** or **Smart random**, which diversifies category, format and difficulty
   and avoids recently used questions) and shows a summary before launch.
2. Launching opens the **presenter desk** at `/host/[gameId]`. The URL carries a one-time host
   token which is stored in the browser and removed from the address bar.
3. Open the **TV display** link (`/display/[gameId]`) on the big screen. Press F11 for full
   screen and tap once so the browser allows sound.
4. Press **Space** to start. Space always performs the primary action shown in the right-hand
   panel (reveal question → open answers → lock → reveal score → next team → results → …).

**Host controls** include: reveal question / rules / board, set order of play, select team,
type an answer for a team, lock, unlock, mark correct (choosing the canonical answer), mark
incorrect, override score, reveal score, next team, reveal rarest / most common answers, show
leaderboard, end pass, end round, eliminate (automatic or manual), pick a tie-break question,
decide who opens the Head-to-Head, run the Final timer (start / pause / reset), enter or correct
final answers, override final answers before reveal, and **Undo last action** at any time.

**Keyboard shortcuts** (press `?` on the desk): `Space` advance, `R` reveal score, `L`
leaderboard, `T` timer, `N` next team, `U` / `⌘Z` undo, `Z` force a Ghost Answer on the next lock
(debug), `Esc` close dialogs.

**Demo / debug panel** (enabled when `NEXT_PUBLIC_ENABLE_DEBUG=true` or in development): force
the next score to 100/50/25/10/5/1/0, skip to Head-to-Head, skip to the Final, force a jackpot
win or loss. Debug actions are rejected by the API when the flag is off.

A completed game is written to history (every answer, score, event and the jackpot story) and
the jackpot bank is updated, so the next game opens with the right amount.

---

## How phones join

The lobby screen shows a 5-character **room code** and a QR code. Teams open **/join**, enter
the code (or scan the QR) and pick their team. The phone receives a team token and becomes that
team's controller at `/play/[gameId]/[teamId]`:

* shows the team name, the question and an answer box only when it is that team's turn;
* shows selectable cards for board formats;
* shows "Answer sent" and lets the team change the answer until the host locks it;
* in the Final: lets the finalists pick the category and type their three answers against the
  countdown.

Contestants never receive scores, the answer universe or other teams' submissions before the
reveal. A refreshed or reconnected phone resumes automatically; the host desk shows which teams
are connected and can always type on a team's behalf.

---

## Creating questions

**Admin → Question bank** lists category, question, format, difficulty, number of accepted
answers, number of zero answers, usage, created date and status (Draft / Ready / Used /
Archived) with filters, bulk status changes, duplicate, delete (used questions are archived
instead), **import** (JSON or CSV) and **export** (JSON or CSV).

The **question editor** walks through category → question → instructions → format → answers
(score 0–100, aliases, known wrong answers) → media upload → source / notes → preview. It
validates that scores are within 0–100, canonical answers are unique, aliases do not clash, every
board card has an answer (or is a decoy), picture cards have images and puzzle cards have text.
"Save as ready" is only enabled when the question is playable.

Format notes:

* **Possible answers board** – cards with an answer score or marked as decoys (score 100).
* **Clues & answers** – each card is a clue with its own accepted answers; wrong answers leave
  the clue on the board. Aim for teams + 3 clues.
* **Linked categories** – two labelled answer pools; each team answers both halves.
* **Picture board** – upload an image per card (stored as a data URL so it works on serverless
  hosts) or reference `/images/...`; modes: image only, numbered grid, image + letters, image as
  clue, image + question. The same card model will carry audio, logos, silhouettes, flags and
  maps.
* **Partial / scrambled** – type the accepted answer, then **Generate from answer** to produce
  the masked or scrambled puzzle.

**Final categories** (Admin → Final categories) group 3–5 open questions as prompts.

CSV import columns: `category, question, instructions, format, difficulty, answer, aliases
(| separated), score, correct, poolIndex, boardItem` with one row per answer.

---

## How surveys work

Survey scores are either entered by hand or produced from real responses. Nothing invents them.

1. **Admin → Surveys → New survey**: title, category, the question participants see, optional
   instructions, participant target (default 100), timer (default 100 s) and, optionally, the
   accepted answer universe (one per line, aliases after `|`).
2. **Open** the survey and share its link (`/survey/[token]`). Participants see the question,
   a countdown, and submit one answer. Responses are anonymous; a cookie prevents the same
   browser answering twice, late answers are stored but flagged invalid, and every participant
   can be invalidated manually.
3. When the target is reached the survey **closes automatically** and the tally is final.
   The admin reviews the tally, **merges variants** (e.g. "USA" and "United States") into a
   canonical answer, accepts new answers or marks raw answers as incorrect.
4. **Publish to question bank** creates (or updates) an open question whose scores are
   `count ÷ valid participants × 100`. Accepted answers nobody gave score 0.

The survey is a recorded sample, not representative polling; the UI says so.

---

## Sound and animation

* `lib/audio/engine.ts` maps game events (`questionReveal`, `answerLocked`, `scoreTick`,
  `scoreLow`, `scoreZero`, `jackpotIncrease`, `teamEliminated`, `headToHeadPoint`,
  `timerWarning`, `timerEnd`, `finalWin`, `finalLoss`, `roundIntro`) to synthesised Web Audio
  placeholders. Drop real recordings in `public/audio` with a `manifest.json` to replace any of
  them (see `public/audio/README.md`). Mute, master, music and effects volumes are per device.
* Framer Motion drives the scene transitions, score countdown, leaderboard re-ordering, jackpot
  counter, elimination, Head-to-Head points and the Final. The score reveal decelerates towards
  the target, holds on 1 before a Ghost Answer, then bursts.
* Reduced motion is honoured (`prefers-reduced-motion` and the game's "animations" setting);
  state is never communicated by colour alone (labels such as "At risk", "Tied", "Not accepted").

---

## Testing

```bash
npm test            # 38 unit tests: scoring rules, matching, full engine runs incl. tie-breaks, H2H, Final, undo
npm run test:e2e    # Playwright: host + display + phone play a question, join errors, admin bank
```

Unit tests cover the required cases: correct answer → its score, zero → 0, incorrect → 100,
zero before the Final → jackpot +250, zero in the Final → win (no +250), failed Final → next
jackpot +1000, won Final → jackpot resets, tie detection and resolution, multi-pass totals,
linked scoring, head-to-head points, role-scoped views hiding scores, undo.

---

## Deployment

**Vercel + hosted PostgreSQL (Neon, Supabase, Vercel Postgres, …)**

1. Create a Vercel project with **Root Directory** = `nadir`.
2. Set the environment variables below; use `npm run vercel-build` as the build command
   (it runs `prisma generate`, `prisma migrate deploy` and `next build`).
3. Switch the schema to PostgreSQL and commit the Postgres migrations
   (`npm run db:provider:postgres`, then `npx prisma migrate dev --name init-postgres` against
   a Postgres URL).
4. Seed sample content once: `DATABASE_URL=… npm run db:seed`.

On serverless hosting the SSE stream only reaches clients served by the same instance; the
clients detect this and fall back to polling every 2.5 s, which is fine for a live room. For
instant multi-instance fan-out, replace `lib/realtime/bus.ts` with a hosted pub/sub.

Media uploads are stored as data URLs in the database (1.5 MB limit) so no writable disk is
needed; point `MediaAsset.url` at blob storage if you prefer.

Set `ADMIN_PASSWORD` in production: it protects `/admin`, `/host` and the game-creation API.
The host desk itself is keyed by a per-game host token.

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file or PostgreSQL connection string | `file:./prisma/dev.db` |
| `ADMIN_PASSWORD` | Protects admin and host dashboards; empty = open (local use) | empty |
| `NEXT_PUBLIC_APP_URL` | Public origin for QR codes / survey links; empty = inferred | empty |
| `NEXT_PUBLIC_ENABLE_DEBUG` | Enables the demo/debug panel in production | `true` |

See `.env.example`. Never commit `.env`.

---

## Project structure

```
nadir/
  app/
    page.tsx                  landing
    host/                     dashboard, new-game wizard, presenter desk
    display/[gameId]/         TV display
    join/, play/[gameId]/[teamId]/   phone join + controller
    admin/                    question bank, editor, final categories, surveys, analytics, history
    survey/[token]/           public survey page
    api/                      games, actions, undo, SSE stream, join, admin, survey
  components/
    display/   scenes, parts (jackpot, leaderboard, timer, H2H scoreboard), DisplayApp
    host/      HostApp, panels, wizard, dashboard, useHost
    controller/ JoinForm, ControllerApp
    admin/     AdminShell, QuestionBank, QuestionEditor, FinalCategories, Surveys, Analytics, History
    game/      ScoreMeter, BoardGrid, AnimatedNumber, QrCode, AudioProvider
    ui/        buttons, inputs, modal, badges, toast
  lib/
    game-engine/  types, engine (reducer), selectors, views (role projections), helpers
    scoring/      pure scoring functions
    matching/     normalisation, edit distance, matcher
    game/         service (persistence, locks, undo, completion), access, selection, action schema
    realtime/     server bus + client hook
    survey/       tally, normalisation, publishing
    audio/        audio engine
    db/           prisma client, question loaders, import/export, analytics
  prisma/         schema, migrations, seed, sample media generator
  tests/unit, tests/e2e
  public/audio, public/images
```

---

## Roadmap hooks

* **AI question generation** – the editor and survey models already separate the *answer
  universe* from *scores*; a generator can draft the universe and open a survey, while scores
  stay survey-derived.
* **Online mode** – the engine is transport-agnostic; access is token based per role; the
  `User` model and per-currency jackpot bank are in place for accounts, remote hosts, spectators
  and tournaments.
* **Media** – `BoardItem.kind` and `MediaAsset.kind` already model audio/logo/silhouette/flag/map
  cards.
