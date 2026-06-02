CREATE TABLE IF NOT EXISTS sync_codes (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0, -- client mutation time (ms epoch) for last-write-wins
  deleted INTEGER NOT NULL DEFAULT 0     -- tombstone flag (record body carries the same)
);

CREATE TABLE IF NOT EXISTS custom_plans (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

-- Per-code JSON blobs (client merges these on pull)
CREATE TABLE IF NOT EXISTS weight_history (
  sync_code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Legacy whole-blob bodyweight (kept for read-only transition; no longer written)
CREATE TABLE IF NOT EXISTS bodyweight (
  sync_code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Per-entry bodyweight so weigh-ins on different devices can't clobber each other
CREATE TABLE IF NOT EXISTS bodyweight_entries (
  sync_code TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sync_code, date)
);

-- Basic per-IP fixed-window rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

-- The text a scheduled push should show, written by the DO at fire time and
-- fetched by the service worker (bodyless push carries no payload).
CREATE TABLE IF NOT EXISTS push_pending (
  endpoint TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_logs_sync   ON workout_logs(sync_code);
CREATE INDEX IF NOT EXISTS idx_plans_sync  ON custom_plans(sync_code);
