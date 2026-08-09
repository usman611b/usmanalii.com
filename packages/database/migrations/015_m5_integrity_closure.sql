-- M5 integrity closure: explicit ADR-005 canonical storage and revision immutability.
ALTER TABLE project_revisions ADD COLUMN canonical_body_json TEXT NOT NULL DEFAULT '[]';

UPDATE project_revisions
SET canonical_body_json = case_study_snapshot
WHERE json_valid(case_study_snapshot) AND json_type(case_study_snapshot) = 'array';

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

-- The legacy column is retained to avoid destructive loss on an unknown
-- persistent baseline, but all future attempts to store an original are denied.
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
