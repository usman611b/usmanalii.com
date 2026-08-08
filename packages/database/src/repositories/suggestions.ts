import type { D1Database } from '@cloudflare/workers-types';
import type { SuggestionEntity, EntityId, ISODateTime, SuggestionState, SuggestionType, SuggestionOrigin } from '@usmanalii/domain';

export interface CreateSuggestionParams {
  id: EntityId;
  ownerId: EntityId;
  suggestionType: SuggestionType;
  title: string;
  description: string;
  payloadJson: string;
  evidenceReferences: readonly EntityId[];
  createdByClassification: SuggestionOrigin;
  modelMetadataJson?: string;
  fingerprint: string;
}

export class D1SuggestionRepository {
  constructor(private readonly db: D1Database) {}

  async createSuggestion(params: CreateSuggestionParams): Promise<SuggestionEntity | null> {
    if (!params.evidenceReferences || params.evidenceReferences.length === 0) {
      throw new Error('INVALID_SUGGESTION: Suggestions require at least 1 eligible evidence reference.');
    }

    // Check if identical suggestion was previously rejected
    const existingRejected = await this.db.prepare(`
      SELECT id FROM suggestions WHERE owner_id = ? AND fingerprint = ? AND suggestion_state = 'rejected'
    `).bind(params.ownerId, params.fingerprint).first();

    if (existingRejected) {
      // Deduplicated — skip inserting repeated rejected suggestion
      return null;
    }

    const now = new Date().toISOString() as ISODateTime;
    const evJson = JSON.stringify(params.evidenceReferences);

    await this.db.prepare(`
      INSERT INTO suggestions (
        id, owner_id, suggestion_type, title, description, payload_json,
        evidence_references, created_by_classification, model_metadata_json,
        suggestion_state, rejection_reason, fingerprint, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?)
    `).bind(
      params.id,
      params.ownerId,
      params.suggestionType,
      params.title,
      params.description,
      params.payloadJson,
      evJson,
      params.createdByClassification,
      params.modelMetadataJson || '{}',
      params.fingerprint,
      now,
      now,
    ).run();

    return this.getSuggestionById(params.ownerId, params.id);
  }

  async getSuggestionById(ownerId: EntityId, id: EntityId): Promise<SuggestionEntity | null> {
    const row = await this.db.prepare(`
      SELECT * FROM suggestions WHERE id = ? AND owner_id = ?
    `).bind(id, ownerId).first();

    if (!row) return null;
    return this.mapRowToSuggestion(row);
  }

  async listPendingSuggestions(ownerId: EntityId): Promise<readonly SuggestionEntity[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM suggestions WHERE owner_id = ? AND suggestion_state = 'pending' ORDER BY created_at DESC
    `).bind(ownerId).all();

    return (results || []).map((r) => this.mapRowToSuggestion(r));
  }

  async rejectSuggestion(ownerId: EntityId, id: EntityId, reason: string): Promise<SuggestionEntity> {
    const now = new Date().toISOString() as ISODateTime;
    const res = await this.db.prepare(`
      UPDATE suggestions
      SET suggestion_state = 'rejected', rejection_reason = ?, updated_at = ?
      WHERE id = ? AND owner_id = ? AND suggestion_state = 'pending'
    `).bind(reason, now, id, ownerId).run();

    if (res.meta.changes === 0) {
      throw new Error('Suggestion not found or not in pending state');
    }

    const updated = await this.getSuggestionById(ownerId, id);
    if (!updated) throw new Error('Suggestion update failed');
    return updated;
  }

  async acceptSuggestionAtomic(
    ownerId: EntityId,
    id: EntityId,
    editedState: 'accepted' | 'edited_and_accepted',
    createEntityStatements: readonly unknown[],
  ): Promise<SuggestionEntity> {
    const now = new Date().toISOString() as ISODateTime;
    const updateStmt = this.db.prepare(`
      UPDATE suggestions
      SET suggestion_state = ?, updated_at = ?
      WHERE id = ? AND owner_id = ? AND suggestion_state = 'pending'
    `).bind(editedState, now, id, ownerId);

    // Execute update + entity creation statements atomically
    await this.db.batch([updateStmt, ...(createEntityStatements as unknown as Parameters<D1Database['batch']>[0])]);

    const updated = await this.getSuggestionById(ownerId, id);
    if (!updated) throw new Error('Suggestion acceptance failed');
    return updated;
  }

  private mapRowToSuggestion(row: Record<string, unknown>): SuggestionEntity {
    let evRefs: EntityId[] = [];
    try {
      evRefs = JSON.parse((row.evidence_references as string) || '[]');
    } catch {
      evRefs = [];
    }

    return {
      id: row.id as EntityId,
      ownerId: row.owner_id as EntityId,
      suggestionType: row.suggestion_type as SuggestionType,
      title: row.title as string,
      description: row.description as string,
      payloadJson: row.payload_json as string,
      evidenceReferences: evRefs,
      createdByClassification: row.created_by_classification as SuggestionOrigin,
      modelMetadataJson: (row.model_metadata_json as string) || '{}',
      suggestionState: row.suggestion_state as SuggestionState,
      rejectionReason: (row.rejection_reason as string) || null,
      fingerprint: row.fingerprint as string,
      createdAt: row.created_at as ISODateTime,
      updatedAt: row.updated_at as ISODateTime,
    };
  }
}
