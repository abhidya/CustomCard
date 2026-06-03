CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  region TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_hash TEXT NOT NULL CHECK (char_length(session_hash) >= 32),
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
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
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('filesystem', 's3-compatible')),
  artifact_count INTEGER NOT NULL CHECK (artifact_count >= 1),
  artifact_manifest JSONB NOT NULL,
  signed_url_expires_at TIMESTAMPTZ NOT NULL,
  external_share_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  real_orders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (real_orders_enabled = FALSE),
  CHECK (signed_url_expires_at > created_at)
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

CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  route_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) >= 12),
  request_hash TEXT NOT NULL CHECK (char_length(request_hash) >= 12),
  response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, route_id, idempotency_key)
);

CREATE TABLE api_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  route_id TEXT NOT NULL,
  idempotency_key_id TEXT REFERENCES idempotency_keys(id),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE UNIQUE INDEX idx_auth_sessions_hash ON auth_sessions(session_hash);
CREATE INDEX idx_provider_connections_user ON provider_connections(user_id);
CREATE INDEX idx_imported_events_connection ON imported_events(connection_id);
CREATE INDEX idx_card_opportunities_event ON card_opportunities(event_id);
CREATE INDEX idx_relationship_memories_recipient ON relationship_memories(user_id, recipient_name);
CREATE INDEX idx_card_projects_opportunity ON card_projects(opportunity_id);
CREATE INDEX idx_render_packets_project ON render_packets(project_id);
CREATE INDEX idx_orders_project ON orders(project_id);
CREATE INDEX idx_order_events_order ON order_events(order_id);
CREATE INDEX idx_vendor_quotes_order ON vendor_quotes(order_id);
CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_data_requests_user ON data_requests(user_id);
CREATE INDEX idx_idempotency_keys_user_route ON idempotency_keys(user_id, route_id);
CREATE INDEX idx_api_jobs_user_status ON api_jobs(user_id, status);
CREATE INDEX idx_audit_subject ON audit_log(subject_type, subject_id);
