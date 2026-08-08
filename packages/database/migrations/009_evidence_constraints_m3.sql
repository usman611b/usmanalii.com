-- Migration 009: Evidence Ledger Constraints, Unique Indexes, and Query Optimization (M3)
--
-- Invariants enforced:
--  1. Owner-scoped uniqueness for external provider identifiers (owner_id, provider, external_id)
--  2. Query optimization indexes for public evidence eligibility lookups
--  3. Query optimization indexes for evidence relationship graph queries
--  4. Query optimization indexes for artifact public delivery

-- 1. Owner-scoped external provider identifier uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_items_owner_provider_external 
  ON evidence_items(owner_id, provider, external_id) 
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;

-- 2. Index for public evidence eligibility queries
CREATE INDEX IF NOT EXISTS idx_evidence_items_public_lookup 
  ON evidence_items(visibility, verification_state, deleted_at, archived_at, occurred_at);

-- 3. Index for evidence links relationship graph lookups
CREATE INDEX IF NOT EXISTS idx_evidence_links_lookup 
  ON evidence_links(evidence_item_id, ordering);

-- 4. Index for artifact public delivery lookups
CREATE INDEX IF NOT EXISTS idx_artifacts_public_lookup 
  ON artifacts(visibility, deleted_at, created_at);

-- 5. Schema Version Update to 9
INSERT INTO schema_versions (version, description, applied_at)
VALUES (9, 'Evidence Ledger M3: owner-scoped provider uniqueness and query optimization indexes', datetime('now'));
