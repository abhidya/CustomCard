-- Durable object-store accounting for artifacts that exist in R2 even when
-- they are not valid customer render_packets rows.

CREATE TABLE artifact_objects (
  object_key TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 's3-compatible'
    CHECK (storage_provider IN ('s3-compatible')),
  project_id TEXT,
  render_packet_id TEXT,
  file_name TEXT NOT NULL,
  artifact_role TEXT NOT NULL CHECK (
    artifact_role IN (
      'handoff-manifest',
      'provider-image',
      'preview-image',
      'persisted-json',
      'prompt-json',
      'input-json',
      'json',
      'artifact',
      'other'
    )
  ),
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  byte_length INTEGER NOT NULL DEFAULT 0 CHECK (byte_length >= 0),
  last_modified_at TIMESTAMPTZ,
  object_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_status TEXT NOT NULL CHECK (link_status IN ('linked', 'unmatched')),
  primary_link_table TEXT,
  primary_link_id TEXT,
  source TEXT NOT NULL DEFAULT 'r2-inventory',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_objects_project_packet
  ON artifact_objects(project_id, render_packet_id);

CREATE INDEX idx_artifact_objects_link_status
  ON artifact_objects(link_status);

CREATE INDEX idx_artifact_objects_last_seen
  ON artifact_objects(last_seen_at DESC);
