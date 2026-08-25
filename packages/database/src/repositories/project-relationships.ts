/**
 * D1 Database Repository for Project Relationships.
 */

import type {
  ProjectRelationshipEntity,
  EntityId,
  ISODateTime,
  CreatedByClassification,
  ApprovalState,
} from '@usmanalii/domain';

interface D1Database {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

export class D1ProjectRelationshipRepository {
  constructor(private readonly db: D1Database) {}

  async createRelationship(input: {
    id: string;
    ownerId: string;
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    relationshipType: string;
    relevance?: number;
    displayOrder?: number;
    provenance?: string | null;
    createdByClassification?: string;
    approvalState?: string;
    ownerNote?: string | null;
  }): Promise<ProjectRelationshipEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO project_relationships (
        id, owner_id, source_id, source_type, target_id, target_type,
        relationship_type, relevance, display_order, provenance,
        created_by_classification, approval_state, owner_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.ownerId,
        input.sourceId,
        input.sourceType,
        input.targetId,
        input.targetType,
        input.relationshipType,
        input.relevance ?? 1,
        input.displayOrder ?? 0,
        input.provenance || '{}',
        input.createdByClassification || 'owner_manual',
        input.approvalState === 'accepted' || !input.approvalState
          ? 'approved'
          : input.approvalState,
        input.ownerNote || null,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      ownerId: input.ownerId as EntityId,
      sourceId: input.sourceId as EntityId,
      sourceType: input.sourceType,
      targetId: input.targetId as EntityId,
      targetType: input.targetType,
      relationshipType: input.relationshipType,
      relevance: input.relevance ?? 1,
      displayOrder: input.displayOrder ?? 0,
      provenance: input.provenance || null,
      createdByClassification: (input.createdByClassification ||
        'owner_manual') as CreatedByClassification,
      approvalState: (input.approvalState || 'accepted') as ApprovalState,
      ownerNote: input.ownerNote || null,
      createdAt: now as ISODateTime,
      archivedAt: null,
    };
  }

  async listRelationships(
    ownerId: string,
    sourceId: string,
  ): Promise<readonly ProjectRelationshipEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM project_relationships WHERE owner_id = ? AND (source_id = ? OR target_id = ?) AND archived_at IS NULL ORDER BY display_order ASC, created_at DESC',
      )
      .bind(ownerId, sourceId, sourceId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      ownerId: r.owner_id as EntityId,
      sourceId: r.source_id as EntityId,
      sourceType: r.source_type as string,
      targetId: r.target_id as EntityId,
      targetType: r.target_type as string,
      relationshipType: r.relationship_type as string,
      relevance: Number(r.relevance || 1),
      displayOrder: Number(r.display_order || 0),
      provenance: (r.provenance as string) || null,
      createdByClassification: r.created_by_classification as CreatedByClassification,
      approvalState: (r.approval_state === 'approved'
        ? 'accepted'
        : r.approval_state) as ApprovalState,
      ownerNote: (r.owner_note as string) || null,
      createdAt: r.created_at as ISODateTime,
      archivedAt: (r.archived_at as ISODateTime) || null,
    }));
  }

  async archiveRelationship(ownerId: string, relationshipId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        'UPDATE project_relationships SET archived_at = ? WHERE owner_id = ? AND id = ? AND archived_at IS NULL',
      )
      .bind(now, ownerId, relationshipId)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  }

  async archiveRelationshipForSource(
    ownerId: string,
    sourceId: string,
    relationshipId: string,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `UPDATE project_relationships SET archived_at = ?
         WHERE owner_id = ? AND source_id = ? AND id = ? AND archived_at IS NULL`,
      )
      .bind(now, ownerId, sourceId, relationshipId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async updateRelationship(
    ownerId: string,
    sourceId: string,
    relationshipId: string,
    input: {
      targetId: string;
      targetType: string;
      relationshipType: string;
      relevance: number;
      displayOrder?: number;
      ownerNote?: string | null;
    },
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE project_relationships SET
           target_id = ?, target_type = ?, relationship_type = ?, relevance = ?,
           display_order = ?, owner_note = ?, created_by_classification = 'owner_manual',
           approval_state = 'approved'
         WHERE owner_id = ? AND source_id = ? AND id = ? AND archived_at IS NULL`,
      )
      .bind(
        input.targetId,
        input.targetType,
        input.relationshipType,
        input.relevance,
        input.displayOrder ?? 0,
        input.ownerNote || null,
        ownerId,
        sourceId,
        relationshipId,
      )
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
