CREATE TABLE IF NOT EXISTS admin_runtime_configs (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_by TEXT,
  pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE),
  raw_customer_content_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_customer_content_stored = FALSE),
  credentials_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (credentials_stored = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_runtime_configs_updated ON admin_runtime_configs(updated_at DESC);
