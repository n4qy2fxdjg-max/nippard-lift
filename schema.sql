CREATE TABLE IF NOT EXISTS sync_codes (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_plans (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weight_history (
  sync_code TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_sync   ON workout_logs(sync_code);
CREATE INDEX IF NOT EXISTS idx_plans_sync  ON custom_plans(sync_code);
