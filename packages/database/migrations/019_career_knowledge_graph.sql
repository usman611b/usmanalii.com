-- Migration 019: Unified Career Knowledge Graph
-- Adds owner-approved professional role clusters and project-to-role membership.
-- All deeper graph nodes are projected from existing canonical project, evidence,
-- skill, capability, content, artifact, and engineering-record tables.

CREATE TABLE IF NOT EXISTS career_roles (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT NOT NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  color              TEXT NOT NULL DEFAULT '#8B5CF6',
  visibility         TEXT NOT NULL DEFAULT 'private'
                              CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  publication_state TEXT NOT NULL DEFAULT 'draft'
                              CHECK (publication_state IN ('draft', 'published', 'archived')),
  ordering          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  archived_at       TEXT,
  version_no        INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_roles_owner_slug
  ON career_roles(owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_career_roles_public
  ON career_roles(visibility, publication_state, ordering)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS project_role_links (
  id                        TEXT PRIMARY KEY,
  owner_id                  TEXT NOT NULL,
  project_id                TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id                   TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
  relationship_type         TEXT NOT NULL DEFAULT 'demonstrates'
                                      CHECK (relationship_type IN ('demonstrates', 'supports', 'explores')),
  relevance                 INTEGER NOT NULL DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  created_by_classification TEXT NOT NULL DEFAULT 'owner'
                                      CHECK (created_by_classification IN ('owner', 'system', 'suggestion')),
  approval_state            TEXT NOT NULL DEFAULT 'accepted'
                                      CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  owner_note                TEXT,
  created_at                TEXT NOT NULL,
  archived_at               TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_role_active_unique
  ON project_role_links(owner_id, project_id, role_id, relationship_type)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_role_role
  ON project_role_links(owner_id, role_id, approval_state)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_role_project
  ON project_role_links(owner_id, project_id, approval_state)
  WHERE archived_at IS NULL;

INSERT INTO schema_versions(version, description, applied_at)
VALUES (19, 'Unified Career Knowledge Graph role clusters and project membership', datetime('now'));
