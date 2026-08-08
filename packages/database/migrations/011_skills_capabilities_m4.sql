-- Migration 011: Milestone M4 — Skills & Capabilities Graph
-- Purpose: Extend skills and capabilities tables; add typed relationship edges, append-only progression log with DB triggers, private owner suggestions, and extensible category taxonomy.

-- 1. Skill Taxonomy Table Extensions
ALTER TABLE skills ADD COLUMN category TEXT NOT NULL DEFAULT 'engineering_practice';
ALTER TABLE skills ADD COLUMN skill_type TEXT NOT NULL DEFAULT 'technical';
ALTER TABLE skills ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('draft', 'active', 'deprecated', 'archived'));
ALTER TABLE skills ADD COLUMN first_observed_at TEXT;
ALTER TABLE skills ADD COLUMN last_demonstrated_at TEXT;
ALTER TABLE skills ADD COLUMN owner_confirmed INTEGER NOT NULL DEFAULT 1 CHECK (owner_confirmed IN (0, 1));
ALTER TABLE skills ADD COLUMN external_identifier TEXT;
ALTER TABLE skills ADD COLUMN provenance_metadata TEXT NOT NULL DEFAULT '{}';

-- 2. Capabilities Table Extensions
ALTER TABLE capabilities ADD COLUMN outcome_statement TEXT NOT NULL DEFAULT '';
ALTER TABLE capabilities ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('draft', 'active', 'deprecated', 'archived'));
ALTER TABLE capabilities ADD COLUMN owner_confirmed INTEGER NOT NULL DEFAULT 1 CHECK (owner_confirmed IN (0, 1));
ALTER TABLE capabilities ADD COLUMN first_demonstrated_at TEXT;
ALTER TABLE capabilities ADD COLUMN last_demonstrated_at TEXT;
ALTER TABLE capabilities ADD COLUMN provenance_metadata TEXT NOT NULL DEFAULT '{}';

-- 3. Typed Skill-to-Skill Relationships
CREATE TABLE IF NOT EXISTS skill_relationships (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  source_skill_id             TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_skill_id             TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship_type           TEXT NOT NULL CHECK (relationship_type IN ('parent_child', 'related', 'prerequisite', 'complementary', 'supersedes', 'applied_with')),
  relevance                   INTEGER NOT NULL DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  ordering                    INTEGER NOT NULL DEFAULT 0,
  evidence_provenance         TEXT NOT NULL DEFAULT '{}',
  created_by_classification   TEXT NOT NULL DEFAULT 'owner' CHECK (created_by_classification IN ('owner', 'system', 'suggestion')),
  approval_state              TEXT NOT NULL DEFAULT 'accepted' CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  owner_note                  TEXT,
  created_at                  TEXT NOT NULL,
  archived_at                 TEXT,
  CHECK (source_skill_id <> target_skill_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_rel_active_unique ON skill_relationships (owner_id, source_skill_id, target_skill_id, relationship_type) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skill_rel_owner ON skill_relationships (owner_id, approval_state);

-- 4. Typed Capability-to-Skill Relationships
CREATE TABLE IF NOT EXISTS capability_skill_relationships (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  capability_id               TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  skill_id                    TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship_type           TEXT NOT NULL CHECK (relationship_type IN ('required', 'supporting', 'complementary')),
  relevance                   INTEGER NOT NULL DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  ordering                    INTEGER NOT NULL DEFAULT 0,
  evidence_provenance         TEXT NOT NULL DEFAULT '{}',
  created_by_classification   TEXT NOT NULL DEFAULT 'owner' CHECK (created_by_classification IN ('owner', 'system', 'suggestion')),
  approval_state              TEXT NOT NULL DEFAULT 'accepted' CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  owner_note                  TEXT,
  created_at                  TEXT NOT NULL,
  archived_at                 TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cap_skill_rel_active_unique ON capability_skill_relationships (owner_id, capability_id, skill_id, relationship_type) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cap_skill_rel_owner ON capability_skill_relationships (owner_id, approval_state);

-- 5. Typed Evidence-to-Skill Links
CREATE TABLE IF NOT EXISTS evidence_skill_links (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  evidence_id                 TEXT NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  skill_id                    TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship_type           TEXT NOT NULL CHECK (relationship_type IN ('introduces', 'practices', 'applies', 'demonstrates', 'sustains', 'validates', 'refreshes', 'contradicts')),
  relevance                   INTEGER NOT NULL DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  ordering                    INTEGER NOT NULL DEFAULT 0,
  evidence_provenance         TEXT NOT NULL DEFAULT '{}',
  created_by_classification   TEXT NOT NULL DEFAULT 'owner' CHECK (created_by_classification IN ('owner', 'system', 'suggestion')),
  approval_state              TEXT NOT NULL DEFAULT 'accepted' CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  owner_note                  TEXT,
  created_at                  TEXT NOT NULL,
  archived_at                 TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ev_skill_link_active_unique ON evidence_skill_links (owner_id, evidence_id, skill_id, relationship_type) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ev_skill_link_owner ON evidence_skill_links (owner_id, skill_id, approval_state);

-- 6. Typed Evidence-to-Capability Links
CREATE TABLE IF NOT EXISTS evidence_capability_links (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  evidence_id                 TEXT NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  capability_id               TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  relationship_type           TEXT NOT NULL CHECK (relationship_type IN ('supports', 'demonstrates', 'validates', 'contradicts')),
  relevance                   INTEGER NOT NULL DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  ordering                    INTEGER NOT NULL DEFAULT 0,
  evidence_provenance         TEXT NOT NULL DEFAULT '{}',
  created_by_classification   TEXT NOT NULL DEFAULT 'owner' CHECK (created_by_classification IN ('owner', 'system', 'suggestion')),
  approval_state              TEXT NOT NULL DEFAULT 'accepted' CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  owner_note                  TEXT,
  created_at                  TEXT NOT NULL,
  archived_at                 TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ev_cap_link_active_unique ON evidence_capability_links (owner_id, evidence_id, capability_id, relationship_type) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ev_cap_link_owner ON evidence_capability_links (owner_id, capability_id, approval_state);

-- 7. Append-Only Progression Events Log
CREATE TABLE IF NOT EXISTS progression_events (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  skill_id                    TEXT REFERENCES skills(id) ON DELETE CASCADE,
  capability_id               TEXT REFERENCES capabilities(id) ON DELETE CASCADE,
  previous_stage              TEXT CHECK (previous_stage IN ('exploring', 'practicing', 'applying', 'demonstrated', 'sustained', 'leadership')),
  new_stage                   TEXT NOT NULL CHECK (new_stage IN ('exploring', 'practicing', 'applying', 'demonstrated', 'sustained', 'leadership')),
  supporting_evidence_ids     TEXT NOT NULL DEFAULT '[]',
  reason                      TEXT NOT NULL,
  actor_classification        TEXT NOT NULL DEFAULT 'owner' CHECK (actor_classification IN ('owner', 'system', 'suggestion')),
  approval_state              TEXT NOT NULL DEFAULT 'accepted' CHECK (approval_state IN ('pending', 'accepted', 'rejected')),
  supersedes_event_id         TEXT REFERENCES progression_events(id),
  created_at                  TEXT NOT NULL,
  CHECK ((skill_id IS NOT NULL AND capability_id IS NULL) OR (skill_id IS NULL AND capability_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_progression_owner_skill ON progression_events (owner_id, skill_id, created_at);
CREATE INDEX IF NOT EXISTS idx_progression_owner_cap ON progression_events (owner_id, capability_id, created_at);

-- Database Triggers enforcing hard Append-Only Immutability on progression_events
CREATE TRIGGER IF NOT EXISTS trg_prevent_progression_update
BEFORE UPDATE ON progression_events
BEGIN
  SELECT RAISE(ABORT, 'PROGRESSION_EVENT_IMMUTABLE: Updates are strictly prohibited. Insert a new event to correct history.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_progression_delete
BEFORE DELETE ON progression_events
BEGIN
  SELECT RAISE(ABORT, 'PROGRESSION_EVENT_IMMUTABLE: Deletions are strictly prohibited.');
END;

-- 8. Private Owner Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id                          TEXT PRIMARY KEY,
  owner_id                    TEXT NOT NULL,
  suggestion_type             TEXT NOT NULL CHECK (suggestion_type IN ('possible_skill', 'possible_evidence_skill_link', 'possible_capability', 'possible_progression_event', 'possible_related_skill')),
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  payload_json                TEXT NOT NULL,
  evidence_references         TEXT NOT NULL,
  created_by_classification   TEXT NOT NULL CHECK (created_by_classification IN ('deterministic_rule', 'system', 'ai_model')),
  model_metadata_json         TEXT NOT NULL DEFAULT '{}',
  suggestion_state            TEXT NOT NULL DEFAULT 'pending' CHECK (suggestion_state IN ('pending', 'accepted', 'edited_and_accepted', 'rejected', 'superseded', 'expired')),
  rejection_reason            TEXT,
  fingerprint                 TEXT NOT NULL,
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suggestions_owner_state ON suggestions (owner_id, suggestion_state);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suggestions_rejected_fingerprint ON suggestions (owner_id, fingerprint) WHERE suggestion_state = 'rejected';

-- 9. Extensible Category Taxonomy
CREATE TABLE IF NOT EXISTS skill_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system   INTEGER NOT NULL DEFAULT 1
);

INSERT INTO schema_versions (version, description, applied_at)
VALUES (11, 'Milestone M4: Skills, Capabilities, Typed Relationship Edges, Progression Events Triggers, and Suggestions', CURRENT_TIMESTAMP);
