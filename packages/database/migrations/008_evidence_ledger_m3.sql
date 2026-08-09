-- ============================================================================
-- Migration: 008_evidence_ledger_m3.sql
-- Description: Evidence Ledger M3 expansion — verification events audit trail,
--              artifact soft-delete lifecycle, and expanded evidence links.
--
-- Database Model §4 (Evidence Ledger), §8 (provenance), §9 (evidence links), §15 (artifacts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Append-only Evidence Verification Events Audit Table
-- Database Model §8 (Evidence provenance & verification history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_verification_events (
  id                  TEXT    PRIMARY KEY,
  evidence_item_id    TEXT    NOT NULL REFERENCES evidence_items(id),
  owner_id            TEXT    NOT NULL,
  previous_state      TEXT,
  new_state           TEXT    NOT NULL
                              CHECK (new_state IN (
                                'unverified', 'owner_verified', 'source_verified',
                                'automatically_observed', 'disputed', 'revoked',
                                'stale', 'broken', 'archived'
                              )),
  verification_method TEXT    NOT NULL,
  verifier_identity   TEXT    NOT NULL,
  rationale           TEXT,
  created_at          TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_events_item
  ON evidence_verification_events (evidence_item_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Add Recoverable Soft-Delete & Description Columns to Artifacts Table
-- Database Model §15 (R2 artifact model)
-- ----------------------------------------------------------------------------
ALTER TABLE artifacts ADD COLUMN deleted_at TEXT;
ALTER TABLE artifacts ADD COLUMN uploaded_by TEXT;
ALTER TABLE artifacts ADD COLUMN description TEXT;
ALTER TABLE evidence_items ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_artifacts_deleted ON artifacts (owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_evidence_items_deleted ON evidence_items (owner_id, deleted_at);

-- ----------------------------------------------------------------------------
-- 3. Add Relevance, Ordering, and Provenance Columns to Evidence Links
-- Database Model §9 (Evidence links)
-- ----------------------------------------------------------------------------
ALTER TABLE evidence_links ADD COLUMN relevance INTEGER DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5);
ALTER TABLE evidence_links ADD COLUMN ordering INTEGER DEFAULT 0;
ALTER TABLE evidence_links ADD COLUMN provenance TEXT;
ALTER TABLE evidence_links ADD COLUMN adr_id TEXT;
ALTER TABLE evidence_links ADD COLUMN experiment_id TEXT;
ALTER TABLE evidence_links ADD COLUMN debugging_lesson_id TEXT;
ALTER TABLE evidence_links ADD COLUMN deployment_id TEXT;

-- ----------------------------------------------------------------------------
-- 4. Schema Version Update to 8
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (8, 'Evidence Ledger M3: verification events, artifact soft-delete, and expanded link targets', datetime('now'));
