-- Migration: per-entry bodyweight sync (replaces the whole-blob model so
-- weigh-ins logged on different devices can't overwrite each other).
-- Apply before deploying:
--   npx wrangler d1 execute lift-db --file=migrations/0002_bodyweight_entries.sql --remote
-- The legacy `bodyweight` blob table is kept for read-only transition.

CREATE TABLE IF NOT EXISTS bodyweight_entries (
  sync_code TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sync_code, date)
);
