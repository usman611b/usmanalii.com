-- ============================================================================
-- Migration: 013_projects_engineering_m5.sql
-- Description: Milestone M5 — Projects & Engineering Record extensions.
-- Adds project_contributions, project_versions, project_relationships,
-- project_revisions, and column extensions for projects, experiments,
-- project_adrs, debugging_lessons, and deployments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Column extensions on projects table
-- ----------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN problem_statement TEXT;
ALTER TABLE projects ADD COLUMN goals TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN non_goals TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN constraints TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN contribution_statement TEXT;
ALTER TABLE projects ADD COLUMN collaboration_context TEXT;
ALTER TABLE projects ADD COLUMN recruiter_summary TEXT;
ALTER TABLE projects ADD COLUMN deep_dive_content TEXT;
ALTER TABLE projects ADD COLUMN repository_references TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN live_demo_references TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN hero_artifact_id TEXT;
ALTER TABLE projects ADD COLUMN case_study_body TEXT;
ALTER TABLE projects ADD COLUMN scheduled_for TEXT;
ALTER TABLE projects ADD COLUMN embargo_until TEXT;
ALTER TABLE projects ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1));
ALTER TABLE projects ADD COLUMN provenance TEXT DEFAULT '{}';
ALTER TABLE projects ADD COLUMN deleted_at TEXT;

-- ----------------------------------------------------------------------------
-- Column extensions on experiments table
-- ----------------------------------------------------------------------------
ALTER TABLE experiments ADD COLUMN motivation TEXT;
ALTER TABLE experiments ADD COLUMN variables TEXT DEFAULT '[]';
ALTER TABLE experiments ADD COLUMN inputs TEXT;
ALTER TABLE experiments ADD COLUMN limitations TEXT;
ALTER TABLE experiments ADD COLUMN dates TEXT;
ALTER TABLE experiments ADD COLUMN supporting_evidence_ids TEXT DEFAULT '[]';
ALTER TABLE experiments ADD COLUMN artifact_ids TEXT DEFAULT '[]';
ALTER TABLE experiments ADD COLUMN provenance TEXT DEFAULT '{}';
ALTER TABLE experiments ADD COLUMN deleted_at TEXT;

-- ----------------------------------------------------------------------------
-- Column extensions on project_adrs table
-- ----------------------------------------------------------------------------
ALTER TABLE project_adrs ADD COLUMN alternatives_considered TEXT DEFAULT '[]';
ALTER TABLE project_adrs ADD COLUMN rationale TEXT;
ALTER TABLE project_adrs ADD COLUMN trade_offs TEXT;
ALTER TABLE project_adrs ADD COLUMN related_adr_ids TEXT DEFAULT '[]';
ALTER TABLE project_adrs ADD COLUMN decision_date TEXT;
ALTER TABLE project_adrs ADD COLUMN supporting_evidence_ids TEXT DEFAULT '[]';
ALTER TABLE project_adrs ADD COLUMN provenance TEXT DEFAULT '{}';
ALTER TABLE project_adrs ADD COLUMN deleted_at TEXT;

-- ----------------------------------------------------------------------------
-- Column extensions on debugging_lessons table
-- ----------------------------------------------------------------------------
ALTER TABLE debugging_lessons ADD COLUMN impact TEXT;
ALTER TABLE debugging_lessons ADD COLUMN environment TEXT;
ALTER TABLE debugging_lessons ADD COLUMN investigation TEXT;
ALTER TABLE debugging_lessons ADD COLUMN lessons_learned TEXT;
ALTER TABLE debugging_lessons ADD COLUMN relevant_dates TEXT;
ALTER TABLE debugging_lessons ADD COLUMN supporting_evidence_ids TEXT DEFAULT '[]';
ALTER TABLE debugging_lessons ADD COLUMN artifact_ids TEXT DEFAULT '[]';
ALTER TABLE debugging_lessons ADD COLUMN provenance TEXT DEFAULT '{}';
ALTER TABLE debugging_lessons ADD COLUMN deleted_at TEXT;

-- ----------------------------------------------------------------------------
-- Column extensions on deployments table
-- ----------------------------------------------------------------------------
ALTER TABLE deployments ADD COLUMN started_at TEXT;
ALTER TABLE deployments ADD COLUMN rollback_info TEXT;
ALTER TABLE deployments ADD COLUMN outcome TEXT;
ALTER TABLE deployments ADD COLUMN supporting_evidence_ids TEXT DEFAULT '[]';
ALTER TABLE deployments ADD COLUMN artifact_ids TEXT DEFAULT '[]';
ALTER TABLE deployments ADD COLUMN state TEXT NOT NULL DEFAULT 'published' CHECK (state IN ('draft', 'published', 'archived'));
ALTER TABLE deployments ADD COLUMN provenance TEXT DEFAULT '{}';
ALTER TABLE deployments ADD COLUMN deleted_at TEXT;

-- ----------------------------------------------------------------------------
-- Project Contributions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_contributions (
  id                      TEXT    PRIMARY KEY,
  project_id              TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id                TEXT    NOT NULL,
  contribution_type       TEXT    NOT NULL
                                  CHECK (contribution_type IN (
                                    'designed', 'implemented', 'tested', 'debugged',
                                    'documented', 'deployed', 'maintained', 'reviewed',
                                    'led', 'collaborated', 'researched'
                                  )),
  description             TEXT    NOT NULL,
  scope                   TEXT,
  start_date              TEXT,
  end_date                TEXT,
  collaboration_context   TEXT,
  supporting_evidence_ids TEXT    NOT NULL DEFAULT '[]',
  verification_state      TEXT    NOT NULL DEFAULT 'unverified'
                                  CHECK (verification_state IN ('unverified', 'self_asserted', 'peer_verified', 'system_verified', 'revoked')),
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  owner_approval          INTEGER NOT NULL DEFAULT 0 CHECK (owner_approval IN (0, 1)),
  provenance              TEXT    NOT NULL DEFAULT '{}',
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  deleted_at              TEXT
);

CREATE INDEX IF NOT EXISTS idx_contributions_project ON project_contributions (project_id, owner_id, visibility);

-- ----------------------------------------------------------------------------
-- Project Versions & Milestones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_versions (
  id                      TEXT    PRIMARY KEY,
  project_id              TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id                TEXT    NOT NULL,
  name                    TEXT    NOT NULL,
  version_identifier      TEXT    NOT NULL,
  description             TEXT,
  status                  TEXT    NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned', 'in_progress', 'released', 'deprecated', 'archived')),
  started_date            TEXT,
  completed_date          TEXT,
  changelog               TEXT,
  outcome                 TEXT,
  supporting_evidence_ids TEXT    NOT NULL DEFAULT '[]',
  artifact_ids            TEXT    NOT NULL DEFAULT '[]',
  previous_version_id     TEXT    REFERENCES project_versions(id),
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                   TEXT    NOT NULL DEFAULT 'draft'
                                  CHECK (state IN ('draft', 'review', 'approved', 'scheduled', 'published', 'unlisted', 'archived')),
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  deleted_at              TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_versions_identifier ON project_versions (project_id, version_identifier);

-- ----------------------------------------------------------------------------
-- Project Relationships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_relationships (
  id                        TEXT    PRIMARY KEY,
  owner_id                  TEXT    NOT NULL,
  source_id                 TEXT    NOT NULL,
  source_type               TEXT    NOT NULL,
  target_id                 TEXT    NOT NULL,
  target_type               TEXT    NOT NULL,
  relationship_type         TEXT    NOT NULL,
  relevance                 INTEGER NOT NULL DEFAULT 1 CHECK (relevance BETWEEN 1 AND 5),
  display_order             INTEGER NOT NULL DEFAULT 0,
  provenance                TEXT    NOT NULL DEFAULT '{}',
  created_by_classification TEXT    NOT NULL DEFAULT 'owner_manual'
                                    CHECK (created_by_classification IN ('owner_manual', 'deterministic_rule', 'system_generated', 'ai_proposed')),
  approval_state            TEXT    NOT NULL DEFAULT 'approved'
                                    CHECK (approval_state IN ('pending', 'approved', 'rejected')),
  owner_note                TEXT,
  created_at                TEXT    NOT NULL,
  archived_at               TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_rel_active
  ON project_relationships (owner_id, source_id, target_id, relationship_type)
  WHERE archived_at IS NULL;

-- ----------------------------------------------------------------------------
-- Project Revisions (History & Rollback)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_revisions (
  id                  TEXT    PRIMARY KEY,
  project_id          TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id            TEXT    NOT NULL,
  revision_no         INTEGER NOT NULL,
  case_study_snapshot TEXT    NOT NULL,
  revision_note       TEXT,
  created_at          TEXT    NOT NULL,
  created_by          TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revisions_project ON project_revisions (project_id, revision_no DESC);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (13, 'Projects & Engineering Record pillar extensions: contributions, versions, relationships, revisions', datetime('now'));
