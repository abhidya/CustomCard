CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  region TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'revoked', 'unsupported')),
  adapter_version TEXT NOT NULL,
  metadata_schema JSONB NOT NULL,
  raw_content_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_content_stored = FALSE),
  encrypted_refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE imported_events (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES provider_connections(id),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  source_evidence TEXT NOT NULL,
  recipient_hint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE card_opportunities (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES imported_events(id),
  recipient_name TEXT NOT NULL,
  lead_time_hours INTEGER NOT NULL CHECK (lead_time_hours >= 0),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  decision TEXT NOT NULL CHECK (decision IN ('pending', 'generate', 'reject', 'snooze')),
  evidence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE relationship_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  sensitivity TEXT NOT NULL,
  locale TEXT NOT NULL,
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forgotten_at TIMESTAMPTZ
);

CREATE TABLE card_projects (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES card_opportunities(id),
  recipient_name TEXT NOT NULL,
  locale TEXT NOT NULL,
  requires_rtl_layout BOOLEAN NOT NULL DEFAULT FALSE,
  approved_memory_ids TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE render_packets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES card_projects(id),
  kind TEXT NOT NULL CHECK (kind IN ('validated_print_packet', 'blocked')),
  width INTEGER NOT NULL CHECK (width = 1500),
  height INTEGER NOT NULL CHECK (height = 2100),
  dpi INTEGER NOT NULL CHECK (dpi = 300),
  locale TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('ltr', 'rtl')),
  safe_zone_passed BOOLEAN NOT NULL,
  text_overflow BOOLEAN NOT NULL,
  checksum TEXT NOT NULL CHECK (checksum ~ '^cc_[0-9a-f]{8}$'),
  artifact_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES card_projects(id),
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'rendered',
      'quoted',
      'external_share_approved',
      'vendor_handoff_blocked',
      'vendor_handoff_ready',
      'vendor_rejected',
      'wrong_store',
      'event_moved_up',
      'cancelled',
      'fulfilled'
    )
  ),
  store_id TEXT,
  quote_cents INTEGER CHECK (quote_cents IS NULL OR quote_cents >= 0),
  pickup_window_minutes INTEGER CHECK (pickup_window_minutes IS NULL OR pickup_window_minutes > 0),
  certification_recorded BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'render_validated',
      'quote_received',
      'external_share_approved',
      'attempt_vendor_handoff',
      'vendor_rejected',
      'wrong_store',
      'event_moved_up',
      'cancel',
      'fulfilled'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_quotes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  vendor TEXT NOT NULL,
  store_id TEXT NOT NULL,
  quote_cents INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  live_quote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  region TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  controls JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE data_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  request_type TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_connections_user ON provider_connections(user_id);
CREATE INDEX idx_card_opportunities_event ON card_opportunities(event_id);
CREATE INDEX idx_relationship_memories_recipient ON relationship_memories(user_id, recipient_name);
CREATE INDEX idx_orders_project ON orders(project_id);
CREATE INDEX idx_audit_subject ON audit_log(subject_type, subject_id);
