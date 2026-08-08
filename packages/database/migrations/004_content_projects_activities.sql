-- ============================================================================
-- Migration: 004_content_projects_activities.sql
-- Description: Content items, projects, activities.
--
-- Database Model §4 (Identity and publication, Engineering record, Activity).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Content items — journal entries, deep dives, retrospectives
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
  id              TEXT    PRIMARY KEY,
  owner_id        TEXT    NOT NULL,
  content_type    TEXT    NOT NULL
                          CHECK (content_type IN ('note', 'journal', 'deep_dive', 'retrospective')),
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  summary         TEXT,
  body_format     TEXT    NOT NULL DEFAULT 'json_blocks'    -- 'json_blocks' or 'markdown'
                          CHECK (body_format IN ('json_blocks', 'markdown')),
  body_schema_version TEXT NOT NULL DEFAULT 'v1',
  reading_time_minutes INTEGER,
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state           TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft', 'review', 'approved', 'scheduled',
                            'published', 'unlisted', 'archived'
                          )),
  occurred_at     TEXT,                                     -- when the work happened
  published_at    TEXT,
  scheduled_for   TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  deleted_at      TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_owner_slug ON content_items (owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_content_owner_state_visibility
  ON content_items (owner_id, state, visibility, occurred_at DESC);

-- Content revisions — immutable history
CREATE TABLE IF NOT EXISTS content_revisions (
  id              TEXT    PRIMARY KEY,
  content_item_id TEXT    NOT NULL REFERENCES content_items(id),
  owner_id        TEXT    NOT NULL,
  revision_no     INTEGER NOT NULL,
  body_snapshot   TEXT    NOT NULL,                         -- full content snapshot
  body_schema_version TEXT NOT NULL,
  revision_note   TEXT,
  created_at      TEXT    NOT NULL,
  created_by      TEXT    NOT NULL                          -- authenticated subject
);

CREATE INDEX IF NOT EXISTS idx_revisions_content ON content_revisions (content_item_id, revision_no DESC);

-- Content <-> Skills links
CREATE TABLE IF NOT EXISTS content_skills (
  content_item_id TEXT    NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  skill_id        TEXT    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at      TEXT    NOT NULL,
  PRIMARY KEY (content_item_id, skill_id)
);

-- Now add FK for evidence_links.content_item_id
-- (Cannot add FK retroactively in SQLite; already references content_items by convention)

-- ----------------------------------------------------------------------------
-- Projects — engineering records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT    PRIMARY KEY,
  owner_id        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  description     TEXT,
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'completed', 'archived', 'dead_demo')),
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state           TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft', 'review', 'approved', 'scheduled',
                            'published', 'unlisted', 'archived'
                          )),
  repository_url  TEXT,
  demo_url        TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  is_collaboration INTEGER NOT NULL DEFAULT 0 CHECK (is_collaboration IN (0, 1)),
  role_description TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_owner_slug ON projects (owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_projects_owner_status_state
  ON projects (owner_id, status, state, visibility);

-- Project <-> Skills links
CREATE TABLE IF NOT EXISTS project_skills (
  project_id      TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id        TEXT    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at      TEXT    NOT NULL,
  PRIMARY KEY (project_id, skill_id)
);

-- Project events — milestones, decisions, experiments, debugging lessons, deployments
CREATE TABLE IF NOT EXISTS project_events (
  id              TEXT    PRIMARY KEY,
  project_id      TEXT    NOT NULL REFERENCES projects(id),
  owner_id        TEXT    NOT NULL,
  event_type      TEXT    NOT NULL
                          CHECK (event_type IN (
                            'milestone', 'experiment', 'adr', 'debugging_lesson',
                            'deployment', 'retrospective', 'note'
                          )),
  title           TEXT    NOT NULL,
  body            TEXT,
  occurred_at     TEXT    NOT NULL,
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_events_project_time
  ON project_events (project_id, occurred_at DESC);

-- ----------------------------------------------------------------------------
-- Activities — normalized dated events for heatmap
-- Database Model §12
-- INVARIANT: Activity is NOT a competence score.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id                    TEXT    PRIMARY KEY,
  owner_id              TEXT    NOT NULL,
  activity_type         TEXT    NOT NULL
                                CHECK (activity_type IN (
                                  'journal_entry', 'evidence_captured', 'capability_updated',
                                  'project_milestone', 'deployment', 'experiment', 'learning', 'other'
                                )),
  occurred_at           TEXT    NOT NULL,
  captured_at           TEXT    NOT NULL,
  source_identity       TEXT,                               -- deduplication key
  dedup_key             TEXT,
  visibility            TEXT    NOT NULL DEFAULT 'private'
                                CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  is_excluded           INTEGER NOT NULL DEFAULT 0          -- excluded from public aggregation
                                CHECK (is_excluded IN (0, 1)),
  visualization_points  INTEGER NOT NULL DEFAULT 1,         -- display weight, NOT competence
  entity_ref            TEXT                                -- JSON reference to related entity
);

-- Activities by owner and occurred time (Database Model §14)
CREATE INDEX IF NOT EXISTS idx_activities_owner_time
  ON activities (owner_id, occurred_at DESC);

-- Public activities index — only public, non-excluded
CREATE INDEX IF NOT EXISTS idx_activities_public_date
  ON activities (occurred_at DESC)
  WHERE visibility = 'public' AND is_excluded = 0;

-- Deduplication constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_dedup
  ON activities (owner_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (4, 'Content items, revisions, projects, project events, activities', datetime('now'));
