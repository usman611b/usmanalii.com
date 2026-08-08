-- ============================================================================
-- Migration: 007_embargo_until.sql
-- Description: Add separate embargo_until column to content_items table.
--
-- Requirement 1: Separate embargo_until condition for public queries.
-- ============================================================================

ALTER TABLE content_items ADD COLUMN embargo_until TEXT;

INSERT INTO schema_versions (version, description, applied_at)
VALUES (7, '007_embargo_until.sql', datetime('now'));
