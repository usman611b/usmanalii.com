-- Migration 010: Artifact Reconciliation Queue for Milestone M3
-- Purpose: Store durable records for failed R2 cleanup deletions or orphan cleanup

CREATE TABLE IF NOT EXISTS artifact_reconciliation_queue (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retried_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_owner_status ON artifact_reconciliation_queue(owner_id, status);

INSERT INTO schema_versions (version, description, applied_at)
VALUES (10, 'Create artifact_reconciliation_queue table for M3 durable cleanup tracking', CURRENT_TIMESTAMP);
