-- ============================================================================
-- Migration: 016_github_evidence_integration_m6.sql
-- Description: Milestone M6 — GitHub Evidence Integration Tables
--
-- Database Model §4 (Activity and automation), §8 (Evidence ledger), §12 (Activity)
-- INVARIANTS:
--  - Owner scope on every record
--  - Never store raw credentials or access tokens in D1
--  - External IDs and fingerprints enforced with UNIQUE constraints
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GitHub Owner Identities — Identity & Commit Attribution Mapping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_owner_identities (
  id                  TEXT    PRIMARY KEY,
  owner_id            TEXT    NOT NULL,
  github_user_id      INTEGER NOT NULL,
  github_login        TEXT    NOT NULL,
  commit_emails_json  TEXT    NOT NULL DEFAULT '[]', -- JSON array of approved emails
  verification_status TEXT    NOT NULL DEFAULT 'unverified'
                              CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'revoked')),
  owner_approval      INTEGER NOT NULL DEFAULT 0
                              CHECK (owner_approval IN (0, 1)),
  last_verified_at    TEXT,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_identities_owner_user
  ON github_owner_identities (owner_id, github_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_identities_owner_login
  ON github_owner_identities (owner_id, github_login);

-- ----------------------------------------------------------------------------
-- GitHub Repositories — Selected and Discovered Repositories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_repositories (
  id                    TEXT    PRIMARY KEY,
  owner_id              TEXT    NOT NULL,
  github_repo_id        INTEGER NOT NULL,
  owner_login           TEXT    NOT NULL,
  name                  TEXT    NOT NULL,
  full_name             TEXT    NOT NULL,
  description           TEXT,
  is_private            INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  is_fork               INTEGER NOT NULL DEFAULT 0 CHECK (is_fork IN (0, 1)),
  is_archived           INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  default_branch        TEXT    NOT NULL DEFAULT 'main',
  primary_language      TEXT,
  topics_json           TEXT    NOT NULL DEFAULT '[]',
  homepage_url          TEXT,
  html_url              TEXT    NOT NULL,
  pushed_at             TEXT,
  created_at_github     TEXT,
  updated_at_github     TEXT,
  license_spdx_id       TEXT,
  parent_repo_full_name TEXT,
  selected_for_sync     INTEGER NOT NULL DEFAULT 1 CHECK (selected_for_sync IN (0, 1)),
  linked_project_id     TEXT    REFERENCES projects(id) ON DELETE SET NULL,
  last_synced_at        TEXT,
  sync_status           TEXT    NOT NULL DEFAULT 'idle'
                                CHECK (sync_status IN (
                                  'idle', 'syncing', 'synced', 'stale', 'error', 'access_revoked'
                                )),
  etag                  TEXT,
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repos_owner_repo_id
  ON github_repositories (owner_id, github_repo_id);

CREATE INDEX IF NOT EXISTS idx_github_repos_sync
  ON github_repositories (owner_id, selected_for_sync, last_synced_at);

-- ----------------------------------------------------------------------------
-- GitHub Sync Checkpoints — Resource Cursors & ETags
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_sync_checkpoints (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  repository_id TEXT NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('repository', 'commit', 'pull_request', 'review', 'release', 'deployment')),
  cursor        TEXT,
  etag          TEXT,
  last_modified TEXT,
  updated_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_checkpoints_unique
  ON github_sync_checkpoints (owner_id, repository_id, resource_type);

-- ----------------------------------------------------------------------------
-- GitHub Imported Objects — Idempotent Cache of Upstream Raw Objects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_imported_objects (
  id                   TEXT PRIMARY KEY,
  owner_id             TEXT NOT NULL,
  repository_id        TEXT NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
  external_type        TEXT NOT NULL CHECK (external_type IN ('repository', 'commit', 'pull_request', 'review', 'release', 'deployment')),
  external_id          TEXT NOT NULL,
  content_hash         TEXT NOT NULL,
  raw_payload_sanitized TEXT NOT NULL,
  upstream_state       TEXT NOT NULL DEFAULT 'imported'
                            CHECK (upstream_state IN (
                              'discovered', 'imported', 'unchanged', 'updated', 'stale', 'missing_upstream', 'access_revoked'
                            )),
  source_url           TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_objects_external
  ON github_imported_objects (owner_id, repository_id, external_type, external_id);

-- ----------------------------------------------------------------------------
-- Evidence Candidates — Private Review Queue for Ingested Evidence
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_candidates (
  id                            TEXT PRIMARY KEY,
  owner_id                      TEXT NOT NULL,
  provider                      TEXT NOT NULL DEFAULT 'github',
  external_type                 TEXT NOT NULL,
  external_id                   TEXT NOT NULL,
  repository_id                 TEXT REFERENCES github_repositories(id) ON DELETE CASCADE,
  source_url                    TEXT NOT NULL,
  source_created_at             TEXT,
  captured_at                   TEXT NOT NULL,
  content_hash                  TEXT NOT NULL,
  attribution_status            TEXT NOT NULL DEFAULT 'unverified_author'
                                     CHECK (attribution_status IN ('verified_owner', 'unverified_author', 'bot_ignored', 'ambiguous')),
  candidate_type                TEXT NOT NULL,
  candidate_title               TEXT NOT NULL,
  candidate_description         TEXT,
  suggested_relationships_json TEXT NOT NULL DEFAULT '[]',
  provenance_json               TEXT NOT NULL DEFAULT '{}',
  upstream_visibility           TEXT NOT NULL DEFAULT 'private' CHECK (upstream_visibility IN ('private', 'public')),
  review_state                  TEXT NOT NULL DEFAULT 'pending_review'
                                     CHECK (review_state IN (
                                       'pending_review', 'accepted', 'edited_and_accepted', 'rejected', 'superseded', 'expired'
                                     )),
  rejection_reason              TEXT,
  fingerprint                   TEXT NOT NULL,
  accepted_evidence_item_id     TEXT REFERENCES evidence_items(id) ON DELETE SET NULL,
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_candidates_fingerprint
  ON evidence_candidates (owner_id, fingerprint);

CREATE INDEX IF NOT EXISTS idx_evidence_candidates_review
  ON evidence_candidates (owner_id, review_state, created_at DESC);

-- ----------------------------------------------------------------------------
-- GitHub Rate Limit Snapshots — Quota & Usage Audit
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_rate_limit_snapshots (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT NOT NULL,
  limit_total       INTEGER NOT NULL,
  remaining         INTEGER NOT NULL,
  reset_at          TEXT NOT NULL,
  used              INTEGER NOT NULL DEFAULT 0,
  resource_category TEXT NOT NULL DEFAULT 'core',
  captured_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_github_rate_limits
  ON github_rate_limit_snapshots (owner_id, captured_at DESC);

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (16, 'Milestone M6: GitHub evidence integration tables, candidates, and rate limit snapshots', datetime('now'));
