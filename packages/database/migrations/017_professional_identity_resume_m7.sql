-- ============================================================================
-- Migration: 017_professional_identity_resume_m7.sql
-- Description: Milestone M7 — Professional Identity & Résumé Engine Tables
--
-- Database Model §3 (Domain definitions), §4 (Identity & publication), §10 (Relational model), §11 (Claim integrity)
-- INVARIANTS:
--  - Owner scope on every record
--  - Optimistic concurrency through version_no on mutable records
--  - Forward-only expansion without editing migrations 001–016
--  - No invented professional facts; explicit publication eligibility
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Profile Extensions (Profiles table in 001_initial.sql)
-- Add owner positioning, availability, location, and asset links
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN availability_state TEXT NOT NULL DEFAULT 'available'
  CHECK (availability_state IN ('available', 'open', 'unavailable', 'busy'));

ALTER TABLE profiles ADD COLUMN preferred_roles TEXT;

ALTER TABLE profiles ADD COLUMN profile_image_url TEXT;

ALTER TABLE profiles ADD COLUMN resume_asset_url TEXT;

ALTER TABLE profiles ADD COLUMN location TEXT;

-- ----------------------------------------------------------------------------
-- Experience Records — Work and Employment History
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_records (
  id                      TEXT    PRIMARY KEY,
  owner_id                TEXT    NOT NULL,
  company                 TEXT    NOT NULL,
  role_title              TEXT    NOT NULL,
  location                TEXT,
  start_date              TEXT    NOT NULL, -- YYYY-MM or YYYY-MM-DD
  end_date                TEXT,             -- NULL if is_current is 1
  is_current              INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  description             TEXT,
  key_achievements        TEXT    NOT NULL DEFAULT '[]', -- JSON array of strings
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                   TEXT    NOT NULL DEFAULT 'draft'
                                  CHECK (state IN ('draft', 'review', 'approved', 'scheduled', 'published', 'unlisted', 'archived')),
  publication_eligibility TEXT    NOT NULL DEFAULT 'eligible'
                                  CHECK (publication_eligibility IN ('eligible', 'ineligible', 'pending_review')),
  ordering                INTEGER NOT NULL DEFAULT 0,
  version_no              INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  archived_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_experience_owner_state
  ON experience_records (owner_id, state, visibility, ordering);

-- ----------------------------------------------------------------------------
-- Education Records — Academic and Structured Learning History
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS education_records (
  id                      TEXT    PRIMARY KEY,
  owner_id                TEXT    NOT NULL,
  institution             TEXT    NOT NULL,
  degree                  TEXT    NOT NULL,
  field_of_study          TEXT,
  start_date              TEXT    NOT NULL,
  end_date                TEXT,
  is_current              INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  grade_or_honors         TEXT,
  description             TEXT,
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                   TEXT    NOT NULL DEFAULT 'draft'
                                  CHECK (state IN ('draft', 'review', 'approved', 'scheduled', 'published', 'unlisted', 'archived')),
  publication_eligibility TEXT    NOT NULL DEFAULT 'eligible'
                                  CHECK (publication_eligibility IN ('eligible', 'ineligible', 'pending_review')),
  ordering                INTEGER NOT NULL DEFAULT 0,
  version_no              INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  archived_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_education_owner_state
  ON education_records (owner_id, state, visibility, ordering);

-- ----------------------------------------------------------------------------
-- Credential Records — Certifications, Licenses, and Verified Qualifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credential_records (
  id                      TEXT    PRIMARY KEY,
  owner_id                TEXT    NOT NULL,
  name                    TEXT    NOT NULL,
  issuing_organization    TEXT    NOT NULL,
  credential_id           TEXT,
  credential_url          TEXT,
  issue_date              TEXT    NOT NULL,
  expiration_date         TEXT,
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                   TEXT    NOT NULL DEFAULT 'draft'
                                  CHECK (state IN ('draft', 'review', 'approved', 'scheduled', 'published', 'unlisted', 'archived')),
  publication_eligibility TEXT    NOT NULL DEFAULT 'eligible'
                                  CHECK (publication_eligibility IN ('eligible', 'ineligible', 'pending_review')),
  ordering                INTEGER NOT NULL DEFAULT 0,
  version_no              INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  archived_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_credential_owner_state
  ON credential_records (owner_id, state, visibility, ordering);

-- ----------------------------------------------------------------------------
-- Claim Supports — Relational Link between Professional Claims and Supporting Entities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_supports (
  id          TEXT PRIMARY KEY,
  claim_id    TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  owner_id    TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (
                'evidence', 'capability', 'skill', 'project', 'engineering_record',
                'experience', 'education', 'credential'
              )),
  target_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_supports_unique
  ON claim_supports (claim_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_claim_supports_claim
  ON claim_supports (owner_id, claim_id);

-- ----------------------------------------------------------------------------
-- Résumé Variants — Curated Presentations of Professional Records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_variants (
  id                  TEXT    PRIMARY KEY,
  owner_id            TEXT    NOT NULL,
  title               TEXT    NOT NULL,
  slug                TEXT    NOT NULL,
  private_description TEXT,
  target_audience     TEXT    NOT NULL DEFAULT 'general'
                              CHECK (target_audience IN (
                                'general', 'software_engineering', 'recruiter_summary',
                                'project_focused', 'job_specific'
                              )),
  template            TEXT    NOT NULL DEFAULT 'classic',
  visibility          TEXT    NOT NULL DEFAULT 'private'
                              CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state               TEXT    NOT NULL DEFAULT 'draft'
                              CHECK (state IN ('draft', 'preview', 'published', 'archived')),
  is_primary          INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  presentation_config TEXT    NOT NULL DEFAULT '{}', -- JSON configuration
  version_no          INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL,
  archived_at         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_variants_slug
  ON resume_variants (owner_id, slug);

CREATE INDEX IF NOT EXISTS idx_resume_variants_owner_state
  ON resume_variants (owner_id, state, visibility);

-- ----------------------------------------------------------------------------
-- Résumé Variant Sections — Structural Order and Inclusion per Variant
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_variant_sections (
  id             TEXT    PRIMARY KEY,
  variant_id     TEXT    NOT NULL REFERENCES resume_variants(id) ON DELETE CASCADE,
  owner_id       TEXT    NOT NULL,
  section_key    TEXT    NOT NULL CHECK (section_key IN (
                   'summary', 'experience', 'education', 'credentials', 'claims',
                   'skills', 'capabilities', 'projects', 'custom'
                 )),
  title          TEXT    NOT NULL,
  included       INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  ordering       INTEGER NOT NULL DEFAULT 0,
  custom_heading TEXT,
  config_json    TEXT    NOT NULL DEFAULT '{}',
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_sections_variant
  ON resume_variant_sections (variant_id, ordering);

-- ----------------------------------------------------------------------------
-- Résumé Variant Items — Selected Records per Section
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_variant_items (
  id             TEXT    PRIMARY KEY,
  variant_id     TEXT    NOT NULL REFERENCES resume_variants(id) ON DELETE CASCADE,
  section_id     TEXT    NOT NULL REFERENCES resume_variant_sections(id) ON DELETE CASCADE,
  owner_id       TEXT    NOT NULL,
  item_type      TEXT    NOT NULL CHECK (item_type IN (
                   'experience', 'education', 'credential', 'claim', 'skill', 'capability', 'project'
                 )),
  item_id        TEXT    NOT NULL,
  custom_wording TEXT,
  included       INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  ordering       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_items_section
  ON resume_variant_items (section_id, ordering);

-- ----------------------------------------------------------------------------
-- Résumé Variant Versions — Immutable Presentation Version History
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_variant_versions (
  id             TEXT    PRIMARY KEY,
  variant_id     TEXT    NOT NULL REFERENCES resume_variants(id) ON DELETE CASCADE,
  owner_id       TEXT    NOT NULL,
  version_no     INTEGER NOT NULL,
  snapshot_json  TEXT    NOT NULL, -- Complete immutable snapshot of variant & items
  change_summary TEXT,
  created_at     TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_versions_unique
  ON resume_variant_versions (variant_id, version_no);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (17, 'Milestone M7: Professional identity extensions, experience, education, credentials, claim supports, and resume variants', datetime('now'));
