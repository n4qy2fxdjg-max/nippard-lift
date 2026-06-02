-- Migration: record-level last-write-wins sync (tombstones + ms timestamps),
-- bodyweight sync, and rate limiting.
-- Apply to the live D1 BEFORE deploying the new worker:
--   npx wrangler d1 execute lift-db --file=migrations/0001_lww.sql --remote
-- Existing rows backfill updated_ms/deleted via the column defaults.

ALTER TABLE workout_logs ADD COLUMN updated_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workout_logs ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;

ALTER TABLE custom_plans ADD COLUMN updated_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE custom_plans ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS bodyweight (
  sync_code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
