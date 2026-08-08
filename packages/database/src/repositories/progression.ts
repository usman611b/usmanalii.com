import type { D1Database } from '@cloudflare/workers-types';
import type { ProgressionEventEntity, EntityId, ISODateTime, ProgressionStage, ProgressionActor } from '@usmanalii/domain';

export interface CreateProgressionEventParams {
  id: EntityId;
  ownerId: EntityId;
  skillId?: EntityId | null;
  capabilityId?: EntityId | null;
  previousStage?: ProgressionStage | null;
  newStage: ProgressionStage;
  supportingEvidenceIds: readonly EntityId[];
  reason: string;
  actorClassification?: ProgressionActor;
  supersedesEventId?: EntityId | null;
}

export class D1ProgressionRepository {
  constructor(private readonly db: D1Database) {}

  async createProgressionEvent(params: CreateProgressionEventParams): Promise<ProgressionEventEntity> {
    const now = new Date().toISOString() as ISODateTime;
    const evidenceJson = JSON.stringify(params.supportingEvidenceIds || []);

    await this.db.prepare(`
      INSERT INTO progression_events (
        id, owner_id, skill_id, capability_id, previous_stage, new_stage,
        supporting_evidence_ids, reason, actor_classification, approval_state,
        supersedes_event_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?)
    `).bind(
      params.id,
      params.ownerId,
      params.skillId || null,
      params.capabilityId || null,
      params.previousStage || null,
      params.newStage,
      evidenceJson,
      params.reason,
      params.actorClassification || 'owner',
      params.supersedesEventId || null,
      now,
    ).run();

    return {
      id: params.id,
      ownerId: params.ownerId,
      skillId: params.skillId || null,
      capabilityId: params.capabilityId || null,
      previousStage: params.previousStage || null,
      newStage: params.newStage,
      supportingEvidenceIds: params.supportingEvidenceIds,
      reason: params.reason,
      actorClassification: params.actorClassification || 'owner',
      approvalState: 'accepted',
      supersedesEventId: params.supersedesEventId || null,
      createdAt: now,
    };
  }

  async getLatestStage(
    ownerId: EntityId,
    target: { skillId?: EntityId; capabilityId?: EntityId },
  ): Promise<ProgressionStage | null> {
    let sql = `SELECT new_stage FROM progression_events WHERE owner_id = ? AND approval_state = 'accepted'`;
    const bindings: unknown[] = [ownerId];

    if (target.skillId) {
      sql += ` AND skill_id = ?`;
      bindings.push(target.skillId);
    } else if (target.capabilityId) {
      sql += ` AND capability_id = ?`;
      bindings.push(target.capabilityId);
    } else {
      return null;
    }

    sql += ` ORDER BY created_at DESC LIMIT 1`;
    const row = await this.db.prepare(sql).bind(...bindings).first();
    if (!row) return null;
    return row.new_stage as ProgressionStage;
  }

  async listProgressionHistory(
    ownerId: EntityId,
    target: { skillId?: EntityId; capabilityId?: EntityId },
  ): Promise<readonly ProgressionEventEntity[]> {
    let sql = `SELECT * FROM progression_events WHERE owner_id = ?`;
    const bindings: unknown[] = [ownerId];

    if (target.skillId) {
      sql += ` AND skill_id = ?`;
      bindings.push(target.skillId);
    } else if (target.capabilityId) {
      sql += ` AND capability_id = ?`;
      bindings.push(target.capabilityId);
    }

    sql += ` ORDER BY created_at ASC`;
    const { results } = await this.db.prepare(sql).bind(...bindings).all();

    return (results || []).map((r) => {
      let evidenceIds: EntityId[] = [];
      try {
        evidenceIds = JSON.parse((r.supporting_evidence_ids as string) || '[]');
      } catch {
        evidenceIds = [];
      }

      return {
        id: r.id as EntityId,
        ownerId: r.owner_id as EntityId,
        skillId: (r.skill_id as EntityId) || null,
        capabilityId: (r.capability_id as EntityId) || null,
        previousStage: (r.previous_stage as ProgressionStage) || null,
        newStage: r.new_stage as ProgressionStage,
        supportingEvidenceIds: evidenceIds,
        reason: r.reason as string,
        actorClassification: r.actor_classification as ProgressionActor,
        approvalState: r.approval_state as ProgressionEventEntity['approvalState'],
        supersedesEventId: (r.supersedes_event_id as EntityId) || null,
        createdAt: r.created_at as ISODateTime,
      };
    });
  }
}
