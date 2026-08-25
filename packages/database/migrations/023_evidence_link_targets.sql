-- Migration 023: rebuild evidence_links so every advertised engineering target
-- participates in the exactly-one-target invariant.

CREATE TABLE evidence_links_v2 (
  id                    TEXT PRIMARY KEY,
  evidence_item_id      TEXT NOT NULL REFERENCES evidence_items(id),
  capability_id         TEXT REFERENCES capabilities(id),
  claim_id              TEXT REFERENCES claims(id),
  project_id            TEXT REFERENCES projects(id),
  content_item_id       TEXT REFERENCES content_items(id),
  artifact_id           TEXT REFERENCES artifacts(id),
  adr_id                TEXT REFERENCES project_adrs(id),
  experiment_id         TEXT REFERENCES experiments(id),
  debugging_lesson_id   TEXT REFERENCES debugging_lessons(id),
  deployment_id         TEXT REFERENCES deployments(id),
  resume_statement_id   TEXT,
  support_type          TEXT NOT NULL CHECK (support_type IN (
                            'demonstrates', 'corroborates', 'historical', 'contradicts'
                          )),
  relevance             INTEGER DEFAULT 3 CHECK (relevance BETWEEN 1 AND 5),
  ordering              INTEGER DEFAULT 0,
  rationale             TEXT NOT NULL,
  provenance            TEXT,
  approval_state        TEXT NOT NULL DEFAULT 'pending'
                               CHECK (approval_state IN ('pending', 'approved', 'rejected')),
  approved_by           TEXT,
  approved_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  CONSTRAINT evidence_link_single_target_v2 CHECK (
    (capability_id       IS NOT NULL) +
    (claim_id            IS NOT NULL) +
    (project_id          IS NOT NULL) +
    (content_item_id     IS NOT NULL) +
    (artifact_id         IS NOT NULL) +
    (adr_id              IS NOT NULL) +
    (experiment_id       IS NOT NULL) +
    (debugging_lesson_id IS NOT NULL) +
    (deployment_id       IS NOT NULL) +
    (resume_statement_id IS NOT NULL) = 1
  )
);

INSERT INTO evidence_links_v2 (
  id, evidence_item_id, capability_id, claim_id, project_id, content_item_id,
  artifact_id, adr_id, experiment_id, debugging_lesson_id, deployment_id,
  support_type, relevance, ordering, rationale, provenance, approval_state,
  approved_by, approved_at, created_at, updated_at
)
SELECT
  id, evidence_item_id, capability_id, claim_id, project_id, content_item_id,
  artifact_id, adr_id, experiment_id, debugging_lesson_id, deployment_id,
  support_type, relevance, ordering, rationale, provenance, approval_state,
  approved_by, approved_at, created_at, updated_at
FROM evidence_links;

DROP TABLE evidence_links;
ALTER TABLE evidence_links_v2 RENAME TO evidence_links;

CREATE INDEX idx_evidence_links_capability
  ON evidence_links (capability_id, approval_state) WHERE capability_id IS NOT NULL;
CREATE INDEX idx_evidence_links_claim
  ON evidence_links (claim_id, approval_state) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_evidence_links_project
  ON evidence_links (project_id, approval_state) WHERE project_id IS NOT NULL;
CREATE INDEX idx_evidence_links_lookup
  ON evidence_links (evidence_item_id, ordering);
CREATE INDEX idx_evidence_links_engineering
  ON evidence_links (adr_id, experiment_id, debugging_lesson_id, deployment_id, approval_state);

INSERT INTO schema_versions (version, description, applied_at)
VALUES (23, 'Evidence links: enforce every canonical and engineering target', datetime('now'));
