-- ============================================================================
-- Migration: 003_evidence_ledger.sql
-- Description: Evidence items, evidence links (typed edges), and artifacts.
--
-- INVARIANT: Every evidence_link references exactly ONE target
-- (enforced via CHECK constraint — exactly one of the target columns is NOT NULL).
--
-- Database Model §4 (Evidence Ledger), §8 (provenance), §9 (evidence links).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Evidence items — the canonical proof records
-- Database Model §8 (Evidence provenance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_items (
  id                      TEXT    PRIMARY KEY,
  owner_id                TEXT    NOT NULL,
  evidence_type           TEXT    NOT NULL
                                  CHECK (evidence_type IN (
                                    'commit', 'pull_request', 'deployment', 'artifact',
                                    'experiment', 'journal_entry', 'work_record',
                                    'certificate', 'publication', 'contribution', 'other'
                                  )),
  source_type             TEXT    NOT NULL
                                  CHECK (source_type IN (
                                    'github', 'url', 'file', 'manual', 'integration', 'owner_attested'
                                  )),
  provider                TEXT,                             -- e.g. "github"
  external_id             TEXT,                             -- provider-specific ID
  canonical_locator       TEXT,                             -- durable URL or path
  title                   TEXT    NOT NULL,
  description             TEXT,
  provider_created_at     TEXT,
  provider_updated_at     TEXT,
  captured_at             TEXT    NOT NULL,
  occurred_at             TEXT,                             -- when the work actually happened
  content_hash            TEXT,                             -- SHA-256 where available
  authorship_note         TEXT,
  provenance_snapshot     TEXT,                             -- immutable JSON snapshot
  license_metadata        TEXT,                             -- JSON
  confidentiality_metadata TEXT,                            -- JSON
  verification_state      TEXT    NOT NULL DEFAULT 'unreviewed'
                                  CHECK (verification_state IN (
                                    'unreviewed', 'owner_verified', 'source_verified',
                                    'stale', 'broken', 'disputed', 'archived'
                                  )),
  verification_method     TEXT,
  verified_by             TEXT,
  verified_at             TEXT,
  quality_signals         TEXT,                             -- JSON — explainable, never a score
  visibility              TEXT    NOT NULL DEFAULT 'private'
                                  CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  embargo_until           TEXT,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL,
  archived_at             TEXT,
  version_no              INTEGER NOT NULL DEFAULT 1
);

-- Evidence by owner, verification, visibility and capture time (Database Model §14)
CREATE INDEX IF NOT EXISTS idx_evidence_owner_verify_visibility
  ON evidence_items (owner_id, verification_state, visibility, captured_at DESC);

-- Deduplication: unique by provider + external_id per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_provider_external
  ON evidence_items (owner_id, provider, external_id)
  WHERE provider IS NOT NULL AND external_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Evidence links — typed edges
-- Database Model §9: "Every row references one evidence item and exactly one target."
-- INVARIANT: CHECK constraint ensures exactly one target column is NOT NULL.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_links (
  id                    TEXT    PRIMARY KEY,
  evidence_item_id      TEXT    NOT NULL REFERENCES evidence_items(id),
  -- Exactly ONE of the following target columns must be NOT NULL:
  capability_id         TEXT    REFERENCES capabilities(id),
  claim_id              TEXT,   -- FK added in migration 005 (claims)
  project_id            TEXT,   -- FK added in migration 004 (projects)
  content_item_id       TEXT,   -- FK added in migration 004 (content)
  artifact_id           TEXT,   -- FK added in migration 004 (artifacts)

  -- INVARIANT: Exactly one target (CHECK enforces sum = 1)
  CONSTRAINT evidence_link_single_target CHECK (
    (capability_id    IS NOT NULL) +
    (claim_id         IS NOT NULL) +
    (project_id       IS NOT NULL) +
    (content_item_id  IS NOT NULL) +
    (artifact_id      IS NOT NULL) = 1
  ),

  support_type    TEXT    NOT NULL
                          CHECK (support_type IN (
                            'demonstrates', 'corroborates', 'historical', 'contradicts'
                          )),
  rationale       TEXT    NOT NULL,
  approval_state  TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (approval_state IN ('pending', 'approved', 'rejected')),
  approved_by     TEXT,
  approved_at     TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

-- Evidence edges by target and approval state (Database Model §14)
CREATE INDEX IF NOT EXISTS idx_evidence_links_capability
  ON evidence_links (capability_id, approval_state)
  WHERE capability_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_links_claim
  ON evidence_links (claim_id, approval_state)
  WHERE claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_links_project
  ON evidence_links (project_id, approval_state)
  WHERE project_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Artifacts — produced objects stored in R2
-- Database Model §4 (Evidence Ledger)
-- SECURITY: r2_key is PRIVATE — never exposed in public DTOs.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artifacts (
  id              TEXT    PRIMARY KEY,
  owner_id        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  artifact_type   TEXT    NOT NULL,                         -- source, notebook, diagram, dataset, etc.
  media_type      TEXT,                                     -- MIME type
  byte_size       INTEGER,
  checksum        TEXT,                                     -- SHA-256
  -- SECURITY: r2_key is NEVER returned in public API responses
  r2_key          TEXT    NOT NULL,                         -- randomized, owner-prefixed
  -- Public derivatives have separate keys
  r2_public_key   TEXT,                                     -- null until public derivative created
  original_name   TEXT,
  visibility      TEXT    NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  archived_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_artifacts_owner ON artifacts (owner_id, visibility, archived_at);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (3, 'Evidence items, evidence links (single-target invariant), artifacts', datetime('now'));
