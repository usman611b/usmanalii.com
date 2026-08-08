-- ============================================================================
-- Migration: 002_skills_capabilities.sql
-- Description: Skills (taxonomy) and capabilities (bounded abilities).
--
-- INVARIANT: No numeric proficiency field may exist in any skills or
-- capabilities table now or in future migrations.
--
-- Database Model §3, §10, §4 (Skills and capabilities entity group).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Skills — taxonomy nodes
-- A skill organizes records; it does NOT assert proficiency.
-- INVARIANT: No proficiency, score, or percentage field is permitted.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id              TEXT    PRIMARY KEY,
  owner_id        TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  description     TEXT,
  parent_id       TEXT    REFERENCES skills(id),            -- taxonomy hierarchy
  aliases         TEXT    NOT NULL DEFAULT '[]',            -- JSON array of strings
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT,
  version_no      INTEGER NOT NULL DEFAULT 1
  -- INVARIANT: No numeric level, percentage, or score fields permitted.
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_owner_slug ON skills (owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_skills_owner_visibility ON skills (owner_id, visibility, archived_at);

-- ----------------------------------------------------------------------------
-- Capabilities — bounded observable abilities
-- Database Model §3, §10
-- Maturity is DESCRIPTIVE — never numeric or percentage.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capabilities (
  id                        TEXT    PRIMARY KEY,
  owner_id                  TEXT    NOT NULL,
  title                     TEXT    NOT NULL,               -- bounded, observable, specific
  slug                      TEXT    NOT NULL,
  description               TEXT    NOT NULL,
  -- Maturity: descriptive states only (not_enough_evidence, observed, practiced,
  --           applied, delivered, sustained) — NEVER a percentage.
  maturity                  TEXT    NOT NULL DEFAULT 'not_enough_evidence'
                                    CHECK (maturity IN (
                                      'not_enough_evidence', 'observed', 'practiced',
                                      'applied', 'delivered', 'sustained'
                                    )),
  maturity_rationale        TEXT    NOT NULL DEFAULT '',    -- required explanation
  maturity_rule_version     TEXT    NOT NULL DEFAULT 'v1.0',
  qualifying_evidence_rules TEXT    NOT NULL DEFAULT '{}',  -- JSON
  visibility                TEXT    NOT NULL DEFAULT 'private'
                                    CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                     TEXT    NOT NULL DEFAULT 'draft'
                                    CHECK (state IN (
                                      'draft', 'review', 'approved', 'scheduled',
                                      'published', 'unlisted', 'archived'
                                    )),
  last_reviewed_at          TEXT,                           -- ISO date YYYY-MM-DD
  created_at                TEXT    NOT NULL,
  updated_at                TEXT    NOT NULL,
  archived_at               TEXT,
  version_no                INTEGER NOT NULL DEFAULT 1
  -- INVARIANT: No percentage, score, or numeric proficiency field.
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capabilities_owner_slug ON capabilities (owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_capabilities_owner_state_visibility
  ON capabilities (owner_id, state, visibility, archived_at);

-- ----------------------------------------------------------------------------
-- Capability <-> Skill taxonomy links
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capability_skills (
  capability_id   TEXT    NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  skill_id        TEXT    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at      TEXT    NOT NULL,
  PRIMARY KEY (capability_id, skill_id)
);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (2, 'Skills taxonomy and capabilities tables (no numeric proficiency)', datetime('now'));
