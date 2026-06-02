-- Migration: background push notifications.
-- Apply before deploying:
--   npx wrangler d1 execute lift-db --file=migrations/0003_push.sql --remote

CREATE TABLE IF NOT EXISTS push_pending (
  endpoint TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);
