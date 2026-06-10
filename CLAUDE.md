# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lift** is a Jeff Nippard-style progressive overload workout tracker PWA deployed to Cloudflare Workers + Pages. It features offline-first local state with optional cross-device sync via a 9-character code, 100+ exercises with form cues, automatic warmup set generation, e1RM tracking, and weekly muscle-volume monitoring against MEV-MRV targets.

Live URL: `https://lift.n4qy2fxdjg.workers.dev`

## Commands

```bash
npm run dev          # Vite dev server on :5173 (proxies /api to :8787)
npx wrangler dev     # Cloudflare Worker on :8787 with D1 bound — run alongside npm run dev
npm run build        # TypeScript check + Vite bundle + esbuild worker
npm run lint         # ESLint (flat config)
npm run deploy       # Build + deploy to Workers + Pages
npm run deploy:worker # Deploy worker only
```

There is no test framework — no test files exist in this project.

### Database migrations (remote)
```bash
npx wrangler d1 execute lift-db --file=migrations/<file>.sql --remote
```
Migrations live in `/migrations/` and must be applied in order (`0001` → `0004`).

## Architecture

### Frontend (React 19 + React Router v7 + Zustand)

**Routing:** 5 tab screens (`Home`, `Library`, `Builder`, `Progress`, `Settings`) plus 2 full-screen routes (`/active`, `/onboarding`). Directional slide transitions are driven by tab index comparisons in the router layer with Framer Motion + `AnimatePresence`.

**State management:** 7 Zustand stores in `src/store/`, each persisted to `localStorage` under a `lift-*-v1` key. Stores that trigger sync use dynamic `import()` of the sync module in their mutation handlers to avoid circular dependencies — do not convert these to static imports.

| Store | Responsibility |
|---|---|
| `useAppStore` | User profile, units (kg/lb), bodyweight log |
| `useWorkoutStore` | Active session + completed workout history |
| `useLibraryStore` | Per-exercise weight history, e1RM tracking |
| `useActivityStore` | Non-lifting sessions (cardio, sports) |
| `useBuilderStore` | Custom plans, drag-to-reorder |
| `useSyncStore` | Sync code, push/pull orchestration |
| `useToastStore` | Toast notification queue |

**Static data** in `src/data/`:
- `exercises.ts` — 100+ exercises with muscle groups, equipment, Jeff Nippard form cues
- `programs.ts` — 6 featured programs (PPL, Upper/Lower, Full Body)
- `activities.ts` — non-lifting activity types

**Design system** in `src/lib/theme.ts`: centralized color palette (`bg`, `surface`, `elevated`, `sheet`, `text`, `muted`, `gold`, `green`, `red`), border-radius tokens, z-index scale (nav: 50, sheet: 101, toast: 150, fullscreen: 200, dialog: 300), and Framer Motion presets. Always use these tokens — do not hardcode colors or z-indices.

### Backend (Cloudflare Workers + D1)

Entry point: `src/worker.ts`. All API routes are under `/api/*`; all other requests serve the SPA (`dist/`).

**Sync API** — last-write-wins per record with tombstone deletes:
- `POST /api/sync/create` — generate a new 9-char CSPRNG code
- `POST /api/sync/verify` — validate a code
- `POST /api/sync/:code/push` — upsert records (accepted only if `updatedAt > server.updatedAt`)
- `GET /api/sync/:code/pull` — return all records including tombstones

**Push notification API** — bodyless push (no payload in the notification itself):
- `POST /api/push/schedule` — schedule a reminder via Durable Object alarm
- `POST /api/push/cancel` — cancel a pending alarm
- `GET /api/push/pending` — service worker fetches the notification text here at delivery time

**Rate limiting:** 30 requests/minute per IP, enforced in D1 `rate_limits` table.

### Sync Model

Every synced record carries `updatedAt` (ms epoch) + `deleted` (tombstone) fields. The sync code is the sole credential — there is no auth beyond knowing the code. Tombstones propagate deletions across devices on the next pull.

### Push Notifications

Uses VAPID Web Push. The notification body is intentionally omitted from the push payload; the service worker fetches text from `/api/push/pending` on delivery. Reminders are scheduled via a `ReminderScheduler` Durable Object using alarms so they fire even when the Worker is idle.

### Active Workout Session

Session state persists to localStorage and is discarded if older than 6 hours. Warmup sets (45/65/80% of working weight) are auto-generated for compound lifts using the last known weight from `useLibraryStore`. A screen wake lock is acquired during sessions and re-acquired on `visibilitychange`.

## Key Conventions

- **Bottom sheets** are the standard UI pattern for all detail views (`src/components/*Sheet.tsx`).
- **Epley formula** (`src/lib/` — search for `e1RM`) is used consistently for strength progress tracking.
- **Muscle volume** tracking uses MEV-MRV targets defined in `src/lib/muscleVolume.ts`; the trailing window is 7 days.
- **IDs** use `nanoid` throughout.
- **Dates/durations** use `date-fns`.
- When adding a new synced entity, add its table to `schema.sql`, write a new migration, and implement LWW + tombstone fields from the start.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
