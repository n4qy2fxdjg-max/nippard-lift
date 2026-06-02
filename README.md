# Lift

A Jeff Nippard-style progressive overload workout tracker, built as a PWA with offline-first storage and optional cross-device sync.

**Live:** https://lift.n4qy2fxdjg.workers.dev

---

## Features

- **100 exercises** with Jeff Nippard form cues, grouped by muscle (Chest → Back → Shoulders → Arms → Lower → Core)
- **Automatic warmup sets** for compound lifts (45 / 65 / 80 % of working weight, rounded to nearest plate)
- **Progressive overload tracking** — e1RM chart per exercise (Epley formula), PR detection on completion
- **Weekly muscle-volume tracker** — trailing 7-day working sets vs. intermediate MEV–MRV targets
- **Custom plans** — drag-to-reorder, add/swap exercises mid-session
- **Featured programmes** — Push / Pull / Legs / Upper / Lower / Full Body
- **Cross-device sync** via a 9-character code (Workers + D1); last-write-wins per record, tombstone deletes that actually propagate
- **Session recovery** — active session persisted to localStorage; reopening the app mid-workout picks up where you left off (sessions > 6 h auto-discarded)
- **Screen wake lock** held for the full workout, re-acquired on visibility change
- **Bodyweight log** with chart on the Progress tab
- **PWA** — installable, works offline, iOS home-screen icon

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript, Framer Motion, Zustand |
| Routing | React Router v7 |
| Build | Vite 8 + vite-plugin-pwa |
| Backend | Cloudflare Workers + D1 (SQLite) |
| Fonts | DM Serif Display (headings), Outfit (body) |

---

## Development

```bash
npm install
npx wrangler dev        # starts Worker on :8787 (D1 bound)
npm run dev             # Vite on :5173, proxies /api → :8787
```

## Deploy

Apply any pending DB migrations first, then deploy:

```bash
npx wrangler d1 execute lift-db --file=migrations/0001_lww.sql --remote
npx wrangler d1 execute lift-db --file=migrations/0002_bodyweight_entries.sql --remote
npm run deploy          # builds, then deploys Workers + mirrors to Pages
```

`npm run deploy` ships the same build to both the Workers URL and the legacy
`nippard-lift` Pages project (both bound to the shared `lift-db`), so neither
front door drifts onto stale sync logic. Use `npm run deploy:worker` for
Workers only. CI does the same pair on push to `main`; PRs run build + typecheck
only (no deploy, so forked PRs don't fail on missing secrets).

---

## Sync design

Each device shares a **9-character code** (`XXXX-XXXX`, ~850 billion combinations, CSPRNG). Records carry an `updatedAt` ms timestamp and a `deleted` tombstone flag. The server upserts by `id` and only overwrites a row when the incoming `updatedAt` is newer — so the last writer wins and deletions propagate instead of resurrecting on the next pull.

The sync code is the only credential; guard it like a password.
