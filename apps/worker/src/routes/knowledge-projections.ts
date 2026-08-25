import type { D1Database } from '@cloudflare/workers-types';

type Row = Record<string, unknown>;

const rows = async (statement: D1PreparedStatement): Promise<Row[]> => {
  const result = await statement.all<Row>();
  return result.results ?? [];
};

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const skillRoot = (row: Row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  aliases: parseJsonArray(row.aliases),
  parentId: row.parent_id,
  category: row.category,
  skillType: row.skill_type,
  lifecycleState: row.lifecycle_state,
  visibility: row.visibility,
  firstObservedAt: row.first_observed_at,
  lastDemonstratedAt: row.last_demonstrated_at,
  ownerConfirmed: Number(row.owner_confirmed ?? 1) === 1,
  externalIdentifier: row.external_identifier,
  provenanceMetadata: row.provenance_metadata,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  versionNo: row.version_no,
});

const capabilityRoot = (row: Row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  outcomeStatement: row.outcome_statement,
  maturity: row.maturity,
  maturityRationale: row.maturity_rationale,
  maturityRuleVersion: row.maturity_rule_version,
  qualifyingEvidenceRules: row.qualifying_evidence_rules,
  visibility: row.visibility,
  state: row.state,
  lifecycleState: row.lifecycle_state,
  ownerConfirmed: Number(row.owner_confirmed ?? 1) === 1,
  firstDemonstratedAt: row.first_demonstrated_at,
  lastDemonstratedAt: row.last_demonstrated_at,
  lastReviewedAt: row.last_reviewed_at,
  provenanceMetadata: row.provenance_metadata,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  versionNo: row.version_no,
});

export async function getSkillProjection(
  db: D1Database,
  ownerId: string,
  lookup: { id?: string; slug?: string },
  publicOnly: boolean,
): Promise<Row | null> {
  const root = await db
    .prepare(
      `SELECT * FROM skills
       WHERE owner_id = ? AND ${lookup.id ? 'id = ?' : 'slug = ?'} AND archived_at IS NULL
         ${publicOnly ? "AND visibility = 'public' AND lifecycle_state <> 'archived'" : ''}`,
    )
    .bind(ownerId, lookup.id ?? lookup.slug ?? '')
    .first<Row>();
  if (!root) return null;
  const id = String(root.id);
  const publicSkill = publicOnly
    ? "AND other.visibility = 'public' AND other.lifecycle_state <> 'archived'"
    : '';
  const publicCapability = publicOnly
    ? "AND cap.visibility = 'public' AND cap.state = 'published' AND cap.lifecycle_state <> 'archived'"
    : '';
  const publicEvidence = publicOnly
    ? "AND ev.visibility = 'public' AND ev.verification_state NOT IN ('disputed','revoked','archived') AND (ev.embargo_until IS NULL OR ev.embargo_until <= datetime('now'))"
    : '';
  const publicProject = publicOnly
    ? "AND p.visibility = 'public' AND p.state = 'published' AND p.status NOT IN ('archived','dead_demo')"
    : '';
  const publicJournal = publicOnly
    ? "AND ci.visibility = 'public' AND ci.state = 'published' AND (ci.embargo_until IS NULL OR ci.embargo_until <= datetime('now')) AND (ci.scheduled_for IS NULL OR ci.scheduled_for <= datetime('now'))"
    : '';

  const [relatedSkills, capabilities, evidence, projects, journal, progression] = await Promise.all(
    [
      rows(
        db
          .prepare(
            `SELECT sr.id AS linkId, sr.relationship_type AS relationshipType,
                  sr.relevance, sr.owner_note AS ownerNote,
                  other.id, other.name, other.slug, other.description, other.category,
                  other.skill_type AS skillType, other.lifecycle_state AS lifecycleState,
                  other.visibility
           FROM skill_relationships sr
           JOIN skills other ON other.id = CASE
             WHEN sr.source_skill_id = ? THEN sr.target_skill_id ELSE sr.source_skill_id END
           WHERE sr.owner_id = ? AND sr.archived_at IS NULL AND sr.approval_state = 'accepted'
             AND (sr.source_skill_id = ? OR sr.target_skill_id = ?)
             AND other.archived_at IS NULL ${publicSkill}
           ORDER BY sr.relevance DESC, other.name`,
          )
          .bind(id, ownerId, id, id),
      ),
      rows(
        db
          .prepare(
            `SELECT csr.id AS linkId, csr.relationship_type AS relationshipType,
                  csr.relevance, csr.owner_note AS ownerNote,
                  cap.id, cap.title, cap.slug, cap.description,
                  cap.outcome_statement AS outcomeStatement, cap.maturity,
                  cap.maturity_rationale AS maturityRationale,
                  cap.visibility, cap.state, cap.lifecycle_state AS lifecycleState
           FROM capability_skill_relationships csr
           JOIN capabilities cap ON cap.id = csr.capability_id
           WHERE csr.owner_id = ? AND csr.skill_id = ? AND csr.archived_at IS NULL
             AND csr.approval_state = 'accepted' AND cap.archived_at IS NULL ${publicCapability}
           ORDER BY csr.relevance DESC, cap.title`,
          )
          .bind(ownerId, id),
      ),
      rows(
        db
          .prepare(
            `SELECT esl.id AS linkId, esl.relationship_type AS relationshipType,
                  esl.relevance, esl.owner_note AS ownerNote,
                  ev.id, ev.title, ev.description, ev.evidence_type AS evidenceType,
                  ev.verification_state AS verificationState, ev.occurred_at AS occurredAt,
                  ev.canonical_locator AS canonicalLocator, ev.visibility
           FROM evidence_skill_links esl
           JOIN evidence_items ev ON ev.id = esl.evidence_id
           WHERE esl.owner_id = ? AND esl.skill_id = ? AND esl.archived_at IS NULL
             AND esl.approval_state = 'accepted' AND ev.archived_at IS NULL AND ev.deleted_at IS NULL
             ${publicEvidence}
           ORDER BY ev.occurred_at DESC, ev.title`,
          )
          .bind(ownerId, id),
      ),
      rows(
        db
          .prepare(
            `SELECT p.id, p.title, p.slug, p.description, p.status,
                  p.visibility, p.state, p.started_at AS startedAt,
                  p.completed_at AS completedAt, 'uses' AS relationshipType
           FROM project_skills ps JOIN projects p ON p.id = ps.project_id
           WHERE ps.skill_id = ? AND p.owner_id = ? AND p.archived_at IS NULL AND p.deleted_at IS NULL
             ${publicProject}
           ORDER BY COALESCE(p.started_at, p.created_at) DESC`,
          )
          .bind(id, ownerId),
      ),
      rows(
        db
          .prepare(
            `SELECT ci.id, ci.title, ci.slug, ci.summary, ci.content_type AS contentType,
                  ci.occurred_at AS occurredAt, ci.state, ci.visibility,
                  'documents' AS relationshipType
           FROM content_skills cs JOIN content_items ci ON ci.id = cs.content_item_id
           WHERE cs.skill_id = ? AND ci.owner_id = ? AND ci.archived_at IS NULL AND ci.deleted_at IS NULL
             ${publicJournal}
           ORDER BY COALESCE(ci.occurred_at, ci.created_at) DESC`,
          )
          .bind(id, ownerId),
      ),
      rows(
        db
          .prepare(
            `SELECT id, previous_stage AS previousStage, new_stage AS newStage,
                  supporting_evidence_ids AS supportingEvidenceIds, reason,
                  actor_classification AS actorClassification,
                  approval_state AS approvalState, created_at AS createdAt
           FROM progression_events
           WHERE owner_id = ? AND skill_id = ? AND approval_state = 'accepted'
           ORDER BY created_at DESC`,
          )
          .bind(ownerId, id),
      ),
    ],
  );
  return {
    ...skillRoot(root),
    relatedSkills,
    capabilities,
    evidence,
    projects,
    journal,
    progression: progression.map((event) => ({
      ...event,
      supportingEvidenceIds: parseJsonArray(event.supportingEvidenceIds),
    })),
  };
}

export async function getCapabilityProjection(
  db: D1Database,
  ownerId: string,
  lookup: { id?: string; slug?: string },
  publicOnly: boolean,
): Promise<Row | null> {
  const root = await db
    .prepare(
      `SELECT * FROM capabilities
       WHERE owner_id = ? AND ${lookup.id ? 'id = ?' : 'slug = ?'} AND archived_at IS NULL
         ${publicOnly ? "AND visibility = 'public' AND state = 'published' AND lifecycle_state <> 'archived'" : ''}`,
    )
    .bind(ownerId, lookup.id ?? lookup.slug ?? '')
    .first<Row>();
  if (!root) return null;
  const id = String(root.id);
  const publicSkill = publicOnly
    ? "AND s.visibility = 'public' AND s.lifecycle_state <> 'archived'"
    : '';
  const publicEvidence = publicOnly
    ? "AND ev.visibility = 'public' AND ev.verification_state NOT IN ('disputed','revoked','archived') AND (ev.embargo_until IS NULL OR ev.embargo_until <= datetime('now'))"
    : '';
  const publicProject = publicOnly
    ? "AND p.visibility = 'public' AND p.state = 'published' AND p.status NOT IN ('archived','dead_demo')"
    : '';
  const publicJournal = publicOnly
    ? "AND ci.visibility = 'public' AND ci.state = 'published' AND (ci.embargo_until IS NULL OR ci.embargo_until <= datetime('now')) AND (ci.scheduled_for IS NULL OR ci.scheduled_for <= datetime('now'))"
    : '';

  const [skills, evidence, projects, journal, progression] = await Promise.all([
    rows(
      db
        .prepare(
          `SELECT csr.id AS linkId, csr.relationship_type AS relationshipType,
                  csr.relevance, csr.owner_note AS ownerNote,
                  s.id, s.name, s.slug, s.description, s.category,
                  s.skill_type AS skillType, s.lifecycle_state AS lifecycleState, s.visibility
           FROM capability_skill_relationships csr
           JOIN skills s ON s.id = csr.skill_id
           WHERE csr.owner_id = ? AND csr.capability_id = ? AND csr.archived_at IS NULL
             AND csr.approval_state = 'accepted' AND s.archived_at IS NULL ${publicSkill}
           ORDER BY csr.relevance DESC, s.name`,
        )
        .bind(ownerId, id),
    ),
    rows(
      db
        .prepare(
          `SELECT ecl.id AS linkId, ecl.relationship_type AS relationshipType,
                  ecl.relevance, ecl.owner_note AS ownerNote,
                  ev.id, ev.title, ev.description, ev.evidence_type AS evidenceType,
                  ev.verification_state AS verificationState, ev.occurred_at AS occurredAt,
                  ev.canonical_locator AS canonicalLocator, ev.visibility
           FROM evidence_capability_links ecl
           JOIN evidence_items ev ON ev.id = ecl.evidence_id
           WHERE ecl.owner_id = ? AND ecl.capability_id = ? AND ecl.archived_at IS NULL
             AND ecl.approval_state = 'accepted' AND ev.archived_at IS NULL AND ev.deleted_at IS NULL
             ${publicEvidence}
           ORDER BY ev.occurred_at DESC, ev.title`,
        )
        .bind(ownerId, id),
    ),
    rows(
      db
        .prepare(
          `SELECT DISTINCT p.id, p.title, p.slug, p.description, p.status,
                  p.visibility, p.state, p.started_at AS startedAt,
                  p.completed_at AS completedAt,
                  COALESCE(pr.relationship_type, 'demonstrates') AS relationshipType
           FROM projects p
           LEFT JOIN project_relationships pr
             ON pr.owner_id = p.owner_id AND pr.source_id = p.id AND pr.source_type = 'project'
            AND pr.target_id = ? AND pr.target_type = 'capability'
            AND pr.approval_state = 'approved' AND pr.archived_at IS NULL
           LEFT JOIN project_skills ps ON ps.project_id = p.id
           LEFT JOIN capability_skill_relationships csr
             ON csr.skill_id = ps.skill_id AND csr.capability_id = ?
            AND csr.approval_state = 'accepted' AND csr.archived_at IS NULL
           WHERE p.owner_id = ? AND p.archived_at IS NULL AND p.deleted_at IS NULL
             AND (pr.id IS NOT NULL OR csr.id IS NOT NULL) ${publicProject}
           ORDER BY COALESCE(p.started_at, p.created_at) DESC`,
        )
        .bind(id, id, ownerId),
    ),
    rows(
      db
        .prepare(
          `SELECT ci.id, ci.title, ci.slug, ci.summary, ci.content_type AS contentType,
                  ci.occurred_at AS occurredAt, ci.state, ci.visibility,
                  cc.relationship_type AS relationshipType
           FROM content_capabilities cc JOIN content_items ci ON ci.id = cc.content_item_id
           WHERE cc.capability_id = ? AND ci.owner_id = ? AND ci.archived_at IS NULL AND ci.deleted_at IS NULL
             ${publicJournal}
           ORDER BY COALESCE(ci.occurred_at, ci.created_at) DESC`,
        )
        .bind(id, ownerId),
    ),
    rows(
      db
        .prepare(
          `SELECT id, previous_stage AS previousStage, new_stage AS newStage,
                  supporting_evidence_ids AS supportingEvidenceIds, reason,
                  actor_classification AS actorClassification,
                  approval_state AS approvalState, created_at AS createdAt
           FROM progression_events
           WHERE owner_id = ? AND capability_id = ? AND approval_state = 'accepted'
           ORDER BY created_at DESC`,
        )
        .bind(ownerId, id),
    ),
  ]);
  return {
    ...capabilityRoot(root),
    skills,
    evidence,
    projects,
    journal,
    progression: progression.map((event) => ({
      ...event,
      supportingEvidenceIds: parseJsonArray(event.supportingEvidenceIds),
    })),
  };
}
