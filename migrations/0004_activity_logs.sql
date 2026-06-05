-- Migration: activity_logs — per-record sync for non-lifting sessions
-- (running, walking, tennis, stair master, etc.), mirroring the workout_logs
-- last-write-wins model (updated_ms + tombstone).
-- Apply to the live D1 BEFORE deploying the new worker:
--   npx wrangler d1 execute lift-db --file=migrations/0004_activity_logs.sql --remote

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0, -- client mutation time (ms epoch) for last-write-wins
  deleted INTEGER NOT NULL DEFAULT 0     -- tombstone flag (record body carries the same)
);

CREATE INDEX IF NOT EXISTS idx_activities_sync ON activity_logs(sync_code);
