-- Preserve the canonical detailed project context submitted by the owner.
-- Historical migrations remain immutable; this is a forward-only correction.
ALTER TABLE projects ADD COLUMN detailed_context TEXT;

INSERT INTO schema_versions (version, description, applied_at)
VALUES (20, 'Persist canonical project detail context for public case studies', datetime('now'));
