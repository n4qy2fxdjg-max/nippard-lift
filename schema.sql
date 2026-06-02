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

CREATE TABLE IF NOT EXISTS bodyweight (
  sync_code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Basic per-IP fixed-window rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_sync   ON workout_logs(sync_code);
CREATE INDEX IF NOT EXISTS idx_plans_sync  ON custom_plans(sync_code);
