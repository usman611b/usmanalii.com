-- ============================================================================
-- Migration: 014_m5_content_model_gate1.sql
-- Description: Milestone M5 Gate 1 & 6 — ADR-005 JSON Block content model,
--              export markdown cache, redaction metadata, and editorial controls.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Column extensions on project_revisions
-- ----------------------------------------------------------------------------
ALTER TABLE project_revisions ADD COLUMN body_format TEXT NOT NULL DEFAULT 'json_blocks';
ALTER TABLE project_revisions ADD COLUMN body_schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_revisions ADD COLUMN markdown_export TEXT;
ALTER TABLE project_revisions ADD COLUMN redaction_metadata TEXT DEFAULT '[]';

-- ----------------------------------------------------------------------------
-- Column extensions on projects
-- ----------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN case_study_format TEXT NOT NULL DEFAULT 'json_blocks';
ALTER TABLE projects ADD COLUMN case_study_schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN editorial_warnings TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN sensitive_original_text TEXT;

-- ----------------------------------------------------------------------------
-- Schema version update
-- ----------------------------------------------------------------------------
INSERT INTO schema_versions (version, description, applied_at)
VALUES (14, 'M5 Content Model compliance: ADR-005 JSON blocks, markdown export, redaction metadata, editorial warnings', datetime('now'));
