-- ============================================================================
-- Migration: 006_engineering_records.sql
-- Description: Dedicated structured tables for engineering records:
--              experiments, adrs, debugging_lessons, deployments.
--
-- Database Model §4 (Engineering record group).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Experiments — hypotheses, methodologies, outcomes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiments (
  id              TEXT    PRIMARY KEY,                      -- UUID
  project_id      TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  hypothesis      TEXT    NOT NULL,
  methodology     TEXT    NOT NULL,
  results         TEXT,
  conclusion      TEXT,
  status          TEXT    NOT NULL DEFAULT 'planned'
                          CHECK (status IN ('planned', 'in_progress', 'concluded', 'abandoned')),
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state           TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft', 'review', 'approved', 'scheduled',
                            'published', 'unlisted', 'archived'
                          )),
  created_at      TEXT    NOT NULL,                         -- UTC ISO-8601
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_experiments_project_slug ON experiments (project_id, slug);
CREATE INDEX IF NOT EXISTS idx_experiments_owner_visibility ON experiments (owner_id, visibility, state);

-- ----------------------------------------------------------------------------
-- ADRs — Architecture Decision Records inside projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_adrs (
  id              TEXT    PRIMARY KEY,
  project_id      TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id        TEXT    NOT NULL,
  adr_number      INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  context         TEXT    NOT NULL,
  decision        TEXT    NOT NULL,
  consequences    TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'proposed'
                          CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded', 'deprecated')),
  superseded_by   TEXT    REFERENCES project_adrs(id),
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state           TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft', 'review', 'approved', 'scheduled',
                            'published', 'unlisted', 'archived'
                          )),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adrs_project_number ON project_adrs (project_id, adr_number);
CREATE INDEX IF NOT EXISTS idx_adrs_owner_visibility ON project_adrs (owner_id, visibility, state);

-- ----------------------------------------------------------------------------
-- Debugging Lessons — post-mortems, root causes, preventions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debugging_lessons (
  id              TEXT    PRIMARY KEY,
  project_id      TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  symptom         TEXT    NOT NULL,
  root_cause      TEXT    NOT NULL,
  resolution      TEXT    NOT NULL,
  prevention      TEXT    NOT NULL,
  tags            TEXT    NOT NULL DEFAULT '[]',            -- JSON array of strings
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state           TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft', 'review', 'approved', 'scheduled',
                            'published', 'unlisted', 'archived'
                          )),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_debugging_lessons_project_slug ON debugging_lessons (project_id, slug);
CREATE INDEX IF NOT EXISTS idx_debugging_lessons_owner_visibility ON debugging_lessons (owner_id, visibility, state);

-- ----------------------------------------------------------------------------
-- Deployments — environment releases & deployment records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deployments (
  id              TEXT    PRIMARY KEY,
  project_id      TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id        TEXT    NOT NULL,
  environment     TEXT    NOT NULL                          -- 'staging', 'production', 'preview'
                          CHECK (environment IN ('preview', 'staging', 'production')),
  release_version TEXT    NOT NULL,
  git_sha         TEXT,
  deployment_url  TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'success', 'failed', 'rolled_back')),
  deployed_at     TEXT    NOT NULL,
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_project_env ON deployments (project_id, environment, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_owner_visibility ON deployments (owner_id, visibility);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (6, 'Dedicated engineering records: experiments, project_adrs, debugging_lessons, deployments', datetime('now'));
