-- Admin-curated public greeting card gallery.
-- Private customer cards are never exposed directly: an admin must create a
-- redacted, public-safe gallery entry and explicitly approve + feature it
-- before anything appears on the public landing page.

CREATE TABLE card_gallery_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES card_projects(id),
  render_packet_id TEXT REFERENCES render_packets(id),
  source_draft_id TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'birthday',
      'graduation',
      'wedding',
      'anniversary',
      'thank-you',
      'sympathy',
      'get-well',
      'new-baby',
      'holiday',
      'custom'
    )
  ),
  title TEXT NOT NULL,
  public_caption TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_rank INTEGER NOT NULL DEFAULT 100,
  public_approved BOOLEAN NOT NULL DEFAULT FALSE,
  front_svg TEXT,
  thumbnail_artifact_uri TEXT,
  front_artifact_uri TEXT,
  inside_left_artifact_uri TEXT,
  inside_right_artifact_uri TEXT,
  back_artifact_uri TEXT,
  redacted BOOLEAN NOT NULL DEFAULT TRUE CHECK (redacted = TRUE),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_gallery_category_featured
  ON card_gallery_entries(category, featured, public_approved, featured_rank);
