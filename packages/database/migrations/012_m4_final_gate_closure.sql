-- Migration 012: M4 final three-gate closure.
-- Safely maps legacy capability maturity values to the canonical progression vocabulary
-- and adds durable scheduler claiming/retry fields to the M3 reconciliation queue.

PRAGMA foreign_keys = OFF;
PRAGMA legacy_alter_table = ON;

ALTER TABLE capabilities RENAME TO capabilities_legacy_m4;

CREATE TABLE capabilities (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL,
  description TEXT NOT NULL, maturity TEXT NOT NULL DEFAULT 'exploring'
    CHECK (maturity IN ('exploring','practicing','applying','demonstrated','sustained','leadership')),
  maturity_rationale TEXT NOT NULL DEFAULT '', maturity_rule_version TEXT NOT NULL DEFAULT 'v2.0',
  qualifying_evidence_rules TEXT NOT NULL DEFAULT '{}', visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','restricted','unlisted','public')),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','review','approved','scheduled','published','unlisted','archived')),
  last_reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  version_no INTEGER NOT NULL DEFAULT 1, outcome_statement TEXT NOT NULL DEFAULT '',
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('draft','active','deprecated','archived')),
  owner_confirmed INTEGER NOT NULL DEFAULT 1 CHECK (owner_confirmed IN (0,1)),
  first_demonstrated_at TEXT, last_demonstrated_at TEXT, provenance_metadata TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO capabilities SELECT
  id, owner_id, title, slug, description,
  CASE maturity WHEN 'observed' THEN 'exploring' WHEN 'practiced' THEN 'practicing'
    WHEN 'applied' THEN 'applying' WHEN 'delivered' THEN 'demonstrated'
    WHEN 'sustained' THEN 'sustained' ELSE 'exploring' END,
  maturity_rationale, 'v2.0', qualifying_evidence_rules, visibility, state,
  last_reviewed_at, created_at, updated_at, archived_at, version_no, outcome_statement,
  lifecycle_state, owner_confirmed, first_demonstrated_at, last_demonstrated_at, provenance_metadata
FROM capabilities_legacy_m4;

DROP TABLE capabilities_legacy_m4;
CREATE UNIQUE INDEX idx_capabilities_owner_slug ON capabilities(owner_id, slug);
CREATE INDEX idx_capabilities_owner_state_visibility ON capabilities(owner_id, state, visibility, archived_at);

ALTER TABLE artifact_reconciliation_queue ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN next_attempt_at TEXT;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN error_message TEXT;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN claim_token TEXT;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN claimed_at TEXT;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN processed_at TEXT;
ALTER TABLE artifact_reconciliation_queue ADD COLUMN updated_at TEXT;
CREATE INDEX idx_reconciliation_due ON artifact_reconciliation_queue(status, next_attempt_at, created_at);
CREATE INDEX idx_reconciliation_claim_token ON artifact_reconciliation_queue(claim_token) WHERE claim_token IS NOT NULL;

PRAGMA legacy_alter_table = OFF;
PRAGMA foreign_keys = ON;

INSERT INTO schema_versions(version, description, applied_at)
VALUES (12, 'M4 canonical progression vocabulary and scheduled reconciliation claiming', CURRENT_TIMESTAMP);
