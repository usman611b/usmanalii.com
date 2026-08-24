-- Migration 021: Engineering Journal Experience and moderated reader responses.
-- Public comments are never evidence and never become professional claims.

ALTER TABLE content_items ADD COLUMN cover_image_url TEXT;
ALTER TABLE content_items ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0
  CHECK (is_featured IN (0, 1));
ALTER TABLE content_items ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (comments_enabled IN (0, 1));
ALTER TABLE content_items ADD COLUMN seo_title TEXT;
ALTER TABLE content_items ADD COLUMN seo_description TEXT;

CREATE TABLE IF NOT EXISTS journal_tags (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (owner_id, slug)
);

CREATE TABLE IF NOT EXISTS journal_entry_tags (
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  tag_id          TEXT NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,
  ordering        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  PRIMARY KEY (content_item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS journal_comments (
  id                 TEXT PRIMARY KEY,
  content_item_id    TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  parent_comment_id  TEXT REFERENCES journal_comments(id),
  author_name        TEXT NOT NULL,
  author_email       TEXT NOT NULL,
  author_website     TEXT,
  body               TEXT NOT NULL,
  moderation_state   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (moderation_state IN ('pending', 'approved', 'rejected', 'spam', 'deleted')),
  request_fingerprint TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  reviewed_at        TEXT,
  reviewer_note      TEXT,
  CHECK (parent_comment_id IS NULL OR parent_comment_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_journal_comments_public
  ON journal_comments(content_item_id, moderation_state, created_at)
  WHERE moderation_state = 'approved';
CREATE INDEX IF NOT EXISTS idx_journal_comments_moderation
  ON journal_comments(moderation_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_comments_rate_limit
  ON journal_comments(request_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS journal_reactions (
  id                  TEXT PRIMARY KEY,
  content_item_id     TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  reaction_type       TEXT NOT NULL CHECK (reaction_type IN ('useful', 'insightful', 'learned')),
  request_fingerprint TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  UNIQUE (content_item_id, reaction_type, request_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_journal_reactions_entry
  ON journal_reactions(content_item_id, reaction_type);

INSERT INTO schema_versions(version, description, applied_at)
VALUES (21, 'Engineering Journal presentation metadata, taxonomy, moderated comments, and reactions', datetime('now'));
