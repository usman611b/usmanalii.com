-- M5 integrity closure: explicit ADR-005 canonical storage and revision immutability.
ALTER TABLE project_revisions ADD COLUMN canonical_body_json TEXT NOT NULL DEFAULT '[]';

UPDATE project_revisions
SET canonical_body_json = case_study_snapshot
WHERE json_valid(case_study_snapshot) AND json_type(case_study_snapshot) = 'array';

-- Empty, malformed, and non-array historical snapshots fail closed to an empty
-- canonical document. The legacy snapshot remains available for private review.
UPDATE project_revisions
SET canonical_body_json = '[]'
WHERE NOT (json_valid(case_study_snapshot) AND json_type(case_study_snapshot) = 'array');

CREATE TRIGGER project_revisions_immutable_update
BEFORE UPDATE ON project_revisions
BEGIN
  SELECT RAISE(ABORT, 'project revisions are immutable');
END;

CREATE TRIGGER project_revisions_immutable_delete
BEFORE DELETE ON project_revisions
BEGIN
  SELECT RAISE(ABORT, 'project revisions are immutable');
END;

-- Record cleanup provenance without copying secret values into metadata, then
-- irreversibly clear any historical unredacted originals before enforcing the
-- no-storage boundary.
CREATE TABLE IF NOT EXISTS sensitive_original_cleanup_events (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  cleared_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason = 'm5_no_unredacted_original_storage')
);

INSERT OR IGNORE INTO sensitive_original_cleanup_events (project_id, cleared_at, reason)
SELECT id, datetime('now'), 'm5_no_unredacted_original_storage'
FROM projects
WHERE sensitive_original_text IS NOT NULL;

UPDATE projects
SET sensitive_original_text = NULL
WHERE sensitive_original_text IS NOT NULL;

-- The physical compatibility column remains, but all future attempts to store
-- an original are denied. Normal updates do not depend on its legacy value.
CREATE TRIGGER projects_deny_sensitive_original_insert
BEFORE INSERT ON projects
WHEN NEW.sensitive_original_text IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'sensitive originals are not stored');
END;

CREATE TRIGGER projects_deny_sensitive_original_update
BEFORE UPDATE OF sensitive_original_text ON projects
WHEN NEW.sensitive_original_text IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'sensitive originals are not stored');
END;

INSERT INTO schema_versions (version, description, applied_at)
VALUES (15, 'M5 integrity closure: canonical revision JSON, immutable history, prohibit sensitive originals', datetime('now'));
