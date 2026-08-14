import type { D1Database } from '@cloudflare/workers-types';
import type {
  EntityId,
  ISODateTime,
  SkillRelationshipEntity,
  CapabilitySkillRelationshipEntity,
  EvidenceSkillLinkEntity,
  EvidenceCapabilityLinkEntity,
} from '@usmanalii/domain';

export class D1GraphRepository {
  constructor(private readonly db: D1Database) {}

  // --- Skill-to-Skill Relationships ---

  async createSkillRelationship(params: {
    id: EntityId;
    ownerId: EntityId;
    sourceSkillId: EntityId;
    targetSkillId: EntityId;
    relationshipType: string;
    relevance?: number;
    ordering?: number;
    ownerNote?: string | null;
    createdByClassification?: string;
    approvalState?: string;
  }): Promise<SkillRelationshipEntity> {
    const now = new Date().toISOString() as ISODateTime;
    await this.db
      .prepare(
        `
      INSERT INTO skill_relationships (
        id, owner_id, source_skill_id, target_skill_id, relationship_type,
        relevance, ordering, evidence_provenance, created_by_classification,
        approval_state, owner_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)
    `,
      )
      .bind(
        params.id,
        params.ownerId,
        params.sourceSkillId,
        params.targetSkillId,
        params.relationshipType,
        params.relevance || 3,
        params.ordering || 0,
        params.createdByClassification || 'owner',
        params.approvalState || 'accepted',
        params.ownerNote || null,
        now,
      )
      .run();

    return {
      id: params.id,
      ownerId: params.ownerId,
      sourceSkillId: params.sourceSkillId,
      targetSkillId: params.targetSkillId,
      relationshipType: params.relationshipType as SkillRelationshipEntity['relationshipType'],
      relevance: params.relevance || 3,
      ordering: params.ordering || 0,
      evidenceProvenance: '{}',
      createdByClassification: (params.createdByClassification ||
        'owner') as SkillRelationshipEntity['createdByClassification'],
      approvalState: (params.approvalState ||
        'accepted') as SkillRelationshipEntity['approvalState'],
      ownerNote: params.ownerNote || null,
      createdAt: now,
      archivedAt: null,
    };
  }

  async getSkillRelationshipsByOwner(
    ownerId: EntityId,
  ): Promise<readonly SkillRelationshipEntity[]> {
    const { results } = await this.db
      .prepare(
        `
      SELECT * FROM skill_relationships WHERE owner_id = ? AND archived_at IS NULL
    `,
      )
      .bind(ownerId)
      .all();

    return (results || []).map((r) => ({
      id: r.id as EntityId,
      ownerId: r.owner_id as EntityId,
      sourceSkillId: r.source_skill_id as EntityId,
      targetSkillId: r.target_skill_id as EntityId,
      relationshipType: r.relationship_type as SkillRelationshipEntity['relationshipType'],
      relevance: (r.relevance as number) || 3,
      ordering: (r.ordering as number) || 0,
      evidenceProvenance: (r.evidence_provenance as string) || '{}',
      createdByClassification:
        r.created_by_classification as SkillRelationshipEntity['createdByClassification'],
      approvalState: r.approval_state as SkillRelationshipEntity['approvalState'],
      ownerNote: (r.owner_note as string) || null,
      createdAt: r.created_at as ISODateTime,
      archivedAt: (r.archived_at as ISODateTime) || null,
    }));
  }

  // --- Capability-to-Skill Relationships ---

  async createCapabilitySkillRelationship(params: {
    id: EntityId;
    ownerId: EntityId;
    capabilityId: EntityId;
    skillId: EntityId;
    relationshipType: string;
    relevance?: number;
    ordering?: number;
    ownerNote?: string | null;
  }): Promise<CapabilitySkillRelationshipEntity> {
    const now = new Date().toISOString() as ISODateTime;
    await this.db
      .prepare(
        `
      INSERT INTO capability_skill_relationships (
        id, owner_id, capability_id, skill_id, relationship_type,
        relevance, ordering, evidence_provenance, created_by_classification,
        approval_state, owner_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'owner', 'accepted', ?, ?)
    `,
      )
      .bind(
        params.id,
        params.ownerId,
        params.capabilityId,
        params.skillId,
        params.relationshipType,
        params.relevance || 3,
        params.ordering || 0,
        params.ownerNote || null,
        now,
      )
      .run();

    return {
      id: params.id,
      ownerId: params.ownerId,
      capabilityId: params.capabilityId,
      skillId: params.skillId,
      relationshipType:
        params.relationshipType as CapabilitySkillRelationshipEntity['relationshipType'],
      relevance: params.relevance || 3,
      ordering: params.ordering || 0,
      evidenceProvenance: '{}',
      createdByClassification: 'owner',
      approvalState: 'accepted',
      ownerNote: params.ownerNote || null,
      createdAt: now,
      archivedAt: null,
    };
  }

  // --- Evidence-to-Skill Links ---

  async linkEvidenceToSkill(params: {
    id: EntityId;
    ownerId: EntityId;
    evidenceId: EntityId;
    skillId: EntityId;
    relationshipType: string;
    relevance?: number;
    ordering?: number;
    ownerNote?: string | null;
  }): Promise<EvidenceSkillLinkEntity> {
    const now = new Date().toISOString() as ISODateTime;
    await this.db
      .prepare(
        `
      INSERT INTO evidence_skill_links (
        id, owner_id, evidence_id, skill_id, relationship_type,
        relevance, ordering, evidence_provenance, created_by_classification,
        approval_state, owner_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'owner', 'accepted', ?, ?)
    `,
      )
      .bind(
        params.id,
        params.ownerId,
        params.evidenceId,
        params.skillId,
        params.relationshipType,
        params.relevance || 3,
        params.ordering || 0,
        params.ownerNote || null,
        now,
      )
      .run();

    return {
      id: params.id,
      ownerId: params.ownerId,
      evidenceId: params.evidenceId,
      skillId: params.skillId,
      relationshipType: params.relationshipType as EvidenceSkillLinkEntity['relationshipType'],
      relevance: params.relevance || 3,
      ordering: params.ordering || 0,
      evidenceProvenance: '{}',
      createdByClassification: 'owner',
      approvalState: 'accepted',
      ownerNote: params.ownerNote || null,
      createdAt: now,
      archivedAt: null,
    };
  }

  // --- Evidence-to-Capability Links ---

  async linkEvidenceToCapability(params: {
    id: EntityId;
    ownerId: EntityId;
    evidenceId: EntityId;
    capabilityId: EntityId;
    relationshipType: string;
    relevance?: number;
    ordering?: number;
    ownerNote?: string | null;
  }): Promise<EvidenceCapabilityLinkEntity> {
    const now = new Date().toISOString() as ISODateTime;
    await this.db
      .prepare(
        `
      INSERT INTO evidence_capability_links (
        id, owner_id, evidence_id, capability_id, relationship_type,
        relevance, ordering, evidence_provenance, created_by_classification,
        approval_state, owner_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'owner', 'accepted', ?, ?)
    `,
      )
      .bind(
        params.id,
        params.ownerId,
        params.evidenceId,
        params.capabilityId,
        params.relationshipType,
        params.relevance || 3,
        params.ordering || 0,
        params.ownerNote || null,
        now,
      )
      .run();

    return {
      id: params.id,
      ownerId: params.ownerId,
      evidenceId: params.evidenceId,
      capabilityId: params.capabilityId,
      relationshipType: params.relationshipType as EvidenceCapabilityLinkEntity['relationshipType'],
      relevance: params.relevance || 3,
      ordering: params.ordering || 0,
      evidenceProvenance: '{}',
      createdByClassification: 'owner',
      approvalState: 'accepted',
      ownerNote: params.ownerNote || null,
      createdAt: now,
      archivedAt: null,
    };
  }

  // --- SQL-Level Pre-filtered Public Graph Query (Section 9 Safety) ---

  async getPublicGraphProjection(): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      type: 'skill' | 'capability';
      category?: string;
      stage?: string;
    }>;
    edges: Array<{ sourceId: string; targetId: string; relationshipType: string }>;
  }> {
    // Only fetch public active skills
    const { results: publicSkills } = await this.db
      .prepare(
        `
      SELECT id, name, category FROM skills WHERE visibility = 'public' AND archived_at IS NULL
    `,
      )
      .all();

    // Only fetch public active published capabilities
    const { results: publicCaps } = await this.db
      .prepare(
        `
      SELECT id, title, maturity FROM capabilities
      WHERE visibility = 'public' AND state = 'published' AND archived_at IS NULL
    `,
      )
      .all();

    const publicNodeIds = new Set([
      ...(publicSkills || []).map((s) => s.id as string),
      ...(publicCaps || []).map((c) => c.id as string),
    ]);

    // Only fetch active skill edges where BOTH source and target are public nodes
    const { results: skillEdges } = await this.db
      .prepare(
        `
      SELECT r.source_skill_id, r.target_skill_id, r.relationship_type
      FROM skill_relationships r
      JOIN skills s1 ON r.source_skill_id = s1.id
      JOIN skills s2 ON r.target_skill_id = s2.id
      WHERE r.approval_state = 'accepted' AND r.archived_at IS NULL
        AND s1.visibility = 'public' AND s1.archived_at IS NULL
        AND s2.visibility = 'public' AND s2.archived_at IS NULL
    `,
      )
      .all();

    const { results: capabilitySkillEdges } = await this.db
      .prepare(
        `
      SELECT r.capability_id, r.skill_id, r.relationship_type
      FROM capability_skill_relationships r
      JOIN capabilities c ON r.capability_id = c.id
      JOIN skills s ON r.skill_id = s.id
      WHERE r.approval_state = 'accepted' AND r.archived_at IS NULL
        AND c.visibility = 'public' AND c.state = 'published' AND c.archived_at IS NULL
        AND s.visibility = 'public' AND s.archived_at IS NULL
    `,
      )
      .all();

    const nodes = [
      ...(publicSkills || []).map((s) => ({
        id: s.id as string,
        name: s.name as string,
        type: 'skill' as const,
        category: s.category as string,
      })),
      ...(publicCaps || []).map((c) => ({
        id: c.id as string,
        name: c.title as string,
        type: 'capability' as const,
        stage: c.maturity as string,
      })),
    ];

    const skillRelationshipEdges = (skillEdges || [])
      .filter(
        (e) =>
          publicNodeIds.has(e.source_skill_id as string) &&
          publicNodeIds.has(e.target_skill_id as string),
      )
      .map((e) => ({
        sourceId: e.source_skill_id as string,
        targetId: e.target_skill_id as string,
        relationshipType: e.relationship_type as string,
      }));

    const capabilityRelationshipEdges = (capabilitySkillEdges || [])
      .filter(
        (edge) =>
          publicNodeIds.has(edge.capability_id as string) &&
          publicNodeIds.has(edge.skill_id as string),
      )
      .map((edge) => ({
        sourceId: edge.skill_id as string,
        targetId: edge.capability_id as string,
        relationshipType: edge.relationship_type as string,
      }));

    const edges = [...skillRelationshipEdges, ...capabilityRelationshipEdges];

    return { nodes, edges };
  }
}
