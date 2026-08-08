-- ============================================================================
-- Migration: 005_claims_integrations_proposals.sql
-- Description: Claims, integrations, AI proposals and claim capabilities.
--
-- INVARIANT: A claim cannot be approved/published without approved evidence support.
-- (Enforced in Worker domain layer — not possible with pure DB constraints alone.)
--
-- Database Model §4 (Identity and publication, Activity and automation), §11 (claims).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Claims — owner-approved professional statements
-- Database Model §3, §11
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id                                        TEXT    PRIMARY KEY,
  owner_id                                  TEXT    NOT NULL,
  wording                                   TEXT    NOT NULL,   -- current draft wording
  approved_wording                          TEXT,               -- immutable snapshot of approved wording
  audience                                  TEXT    NOT NULL
                                                    CHECK (audience IN ('recruiter', 'technical', 'general', 'resume')),
  context                                   TEXT,
  approval_state                            TEXT    NOT NULL DEFAULT 'draft'
                                                    CHECK (approval_state IN (
                                                      'draft', 'pending', 'approved', 'rejected', 'expired'
                                                    )),
  approved_at                               TEXT,
  review_date                               TEXT,               -- ISO date YYYY-MM-DD
  is_background_statement_exception         INTEGER NOT NULL DEFAULT 0
                                                    CHECK (is_background_statement_exception IN (0, 1)),
  background_statement_exception_reason     TEXT,
  -- INVARIANT: background exception cannot cover credentials, employment,
  -- quantified outcomes or delivered work (enforced in Worker domain layer)
  visibility                                TEXT    NOT NULL DEFAULT 'private'
                                                    CHECK (visibility IN ('private', 'restricted', 'unlisted', 'public')),
  state                                     TEXT    NOT NULL DEFAULT 'draft'
                                                    CHECK (state IN (
                                                      'draft', 'review', 'approved', 'scheduled',
                                                      'published', 'unlisted', 'archived'
                                                    )),
  created_at                                TEXT    NOT NULL,
  updated_at                                TEXT    NOT NULL,
  archived_at                               TEXT,
  version_no                                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_claims_owner_state
  ON claims (owner_id, state, visibility, archived_at);

-- Claim <-> Capability links
CREATE TABLE IF NOT EXISTS claim_capabilities (
  claim_id        TEXT    NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  capability_id   TEXT    NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  created_at      TEXT    NOT NULL,
  PRIMARY KEY (claim_id, capability_id)
);

-- ----------------------------------------------------------------------------
-- Integrations — external service connections
-- Database Model §4 (Activity and automation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
  id              TEXT    PRIMARY KEY,
  owner_id        TEXT    NOT NULL,
  provider        TEXT    NOT NULL,                          -- 'github', 'manual', etc.
  display_name    TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'inactive'
                          CHECK (status IN ('active', 'inactive', 'error', 'revoked')),
  -- SECURITY: credentials/tokens are NEVER stored in D1 — use Cloudflare secrets
  config_metadata TEXT    NOT NULL DEFAULT '{}',             -- non-secret config JSON
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_owner ON integrations (owner_id, provider);

-- Sync runs — integration run history
CREATE TABLE IF NOT EXISTS sync_runs (
  id              TEXT    PRIMARY KEY,
  integration_id  TEXT    NOT NULL REFERENCES integrations(id),
  owner_id        TEXT    NOT NULL,
  status          TEXT    NOT NULL
                          CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at      TEXT,
  completed_at    TEXT,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_created   INTEGER NOT NULL DEFAULT 0,
  items_updated   INTEGER NOT NULL DEFAULT 0,
  items_skipped   INTEGER NOT NULL DEFAULT 0,
  error_summary   TEXT                                       -- safe error summary, no private content
);

-- Source events — raw events from integrations
CREATE TABLE IF NOT EXISTS source_events (
  id              TEXT    PRIMARY KEY,
  integration_id  TEXT    NOT NULL REFERENCES integrations(id),
  owner_id        TEXT    NOT NULL,
  event_type      TEXT    NOT NULL,
  external_event_id TEXT,                                    -- for idempotency
  raw_payload     TEXT,                                      -- SANITIZED before storage
  processing_state TEXT   NOT NULL DEFAULT 'pending'
                          CHECK (processing_state IN ('pending', 'processed', 'failed', 'rejected')),
  received_at     TEXT    NOT NULL,
  processed_at    TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_events_external_id
  ON source_events (integration_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- AI proposals — proposal-only, never auto-approved
-- Database Model §4, Master Prompt invariants
-- INVARIANT: AI cannot approve or publish professional facts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_proposals (
  id                  TEXT    PRIMARY KEY,
  owner_id            TEXT    NOT NULL,
  proposal_type       TEXT    NOT NULL,
  target_entity_type  TEXT,
  target_entity_id    TEXT,
  state               TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (state IN (
                                'pending', 'under_review', 'approved', 'rejected', 'superseded', 'expired'
                              )),
  risk_level          TEXT    NOT NULL DEFAULT 'medium'
                              CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence          REAL,                                  -- 0.0-1.0 model confidence, NOT proficiency
  rationale           TEXT    NOT NULL,
  source_context      TEXT,                                  -- sanitized context used (no secrets)
  model_version       TEXT    NOT NULL,
  prompt_version      TEXT    NOT NULL,
  created_at          TEXT    NOT NULL,
  reviewed_at         TEXT,
  reviewed_by         TEXT,
  expires_at          TEXT
);

-- AI proposals by owner, state, risk (Database Model §14)
CREATE INDEX IF NOT EXISTS idx_ai_proposals_owner_state
  ON ai_proposals (owner_id, state, risk_level, created_at DESC);

-- AI proposal field-level changes
CREATE TABLE IF NOT EXISTS ai_proposal_changes (
  id              TEXT    PRIMARY KEY,
  proposal_id     TEXT    NOT NULL REFERENCES ai_proposals(id),
  field_path      TEXT    NOT NULL,
  previous_value  TEXT,
  proposed_value  TEXT,
  applied_at      TEXT,
  applied_by      TEXT
);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (5, 'Claims, integrations, sync runs, source events, AI proposals', datetime('now'));
