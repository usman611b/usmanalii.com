-- Migration 022: Canonical Journal <-> Capability relationships.
-- Skills already have content_skills; this table gives capabilities the same
-- owner-manageable, queryable connection instead of relying only on revision JSON.

CREATE TABLE IF NOT EXISTS content_capabilities (
  content_item_id   TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  capability_id     TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related'
                         CHECK (relationship_type IN ('learns', 'practices', 'applies', 'demonstrates', 'related')),
  created_at        TEXT NOT NULL,
  PRIMARY KEY (content_item_id, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_content_capabilities_capability
  ON content_capabilities(capability_id, content_item_id);

-- Backfill relationship tags already stored in the latest immutable Journal revision.
INSERT OR IGNORE INTO content_capabilities (
  content_item_id, capability_id, relationship_type, created_at
)
SELECT
  ci.id,
  json_extract(block.value, '$.entityId'),
  CASE json_extract(block.value, '$.relationshipType')
    WHEN 'learns' THEN 'learns'
    WHEN 'practices' THEN 'practices'
    WHEN 'applies' THEN 'applies'
    WHEN 'demonstrates' THEN 'demonstrates'
    ELSE 'related'
  END,
  COALESCE(ci.updated_at, ci.created_at)
FROM content_items ci
JOIN content_revisions cr
  ON cr.content_item_id = ci.id
 AND cr.revision_no = (
   SELECT MAX(latest.revision_no)
   FROM content_revisions latest
   WHERE latest.content_item_id = ci.id
 )
JOIN json_each(cr.body_snapshot) block
JOIN capabilities cap
  ON cap.id = json_extract(block.value, '$.entityId')
 AND cap.owner_id = ci.owner_id
WHERE json_extract(block.value, '$.type') = 'relationship_tag'
  AND json_extract(block.value, '$.entityType') = 'capability';

INSERT INTO schema_versions(version, description, applied_at)
VALUES (22, 'Canonical owner-managed Journal-to-capability relationships', datetime('now'));
