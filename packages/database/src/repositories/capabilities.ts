import type { D1Database } from '@cloudflare/workers-types';
import type { CapabilityEntity, EntityId, ISODateTime } from '@usmanalii/domain';

export interface CreateCapabilityParams {
  id: EntityId;
  ownerId: EntityId;
  title: string;
  slug: string;
  description: string;
  outcomeStatement: string;
  visibility?: 'private' | 'restricted' | 'unlisted' | 'public';
  state?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'unlisted' | 'archived';
  lifecycleState?: 'draft' | 'active' | 'deprecated' | 'archived';
}

export interface UpdateCapabilityParams {
  title?: string;
  slug?: string;
  description?: string;
  outcomeStatement?: string;
  visibility?: 'private' | 'restricted' | 'unlisted' | 'public';
  state?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'unlisted' | 'archived';
  lifecycleState?: 'draft' | 'active' | 'deprecated' | 'archived';
  archivedAt?: ISODateTime | null;
  versionNo: number;
}

export class D1CapabilityRepository {
  constructor(private readonly db: D1Database) {}

  async createCapability(params: CreateCapabilityParams): Promise<CapabilityEntity> {
    const now = new Date().toISOString() as ISODateTime;
    const stmt = this.db.prepare(`
      INSERT INTO capabilities (
        id, owner_id, title, slug, description, outcome_statement, maturity,
        maturity_rationale, maturity_rule_version, qualifying_evidence_rules,
        visibility, state, lifecycle_state, owner_confirmed, provenance_metadata,
        created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, 'not_enough_evidence', 'Initial creation', 'v1.0', '{}', ?, ?, ?, 1, '{}', ?, ?, 1)
    `);

    await stmt.bind(
      params.id,
      params.ownerId,
      params.title,
      params.slug,
      params.description,
      params.outcomeStatement,
      params.visibility || 'private',
      params.state || 'draft',
      params.lifecycleState || 'active',
      now,
      now,
    ).run();

    const created = await this.getCapabilityById(params.ownerId, params.id);
    if (!created) throw new Error('Capability creation failed');
    return created;
  }

  async getCapabilityById(ownerId: EntityId, id: EntityId): Promise<CapabilityEntity | null> {
    const row = await this.db.prepare(`
      SELECT * FROM capabilities WHERE id = ? AND owner_id = ?
    `).bind(id, ownerId).first();

    if (!row) return null;
    return this.mapRowToCapability(row);
  }

  async getCapabilityBySlug(ownerId: EntityId, slug: string): Promise<CapabilityEntity | null> {
    const row = await this.db.prepare(`
      SELECT * FROM capabilities WHERE slug = ? AND owner_id = ?
    `).bind(slug, ownerId).first();

    if (!row) return null;
    return this.mapRowToCapability(row);
  }

  async listCapabilitiesByOwner(
    ownerId: EntityId,
    filters?: { state?: string; visibility?: string; limit?: number },
  ): Promise<readonly CapabilityEntity[]> {
    let sql = `SELECT * FROM capabilities WHERE owner_id = ? AND archived_at IS NULL`;
    const bindings: unknown[] = [ownerId];

    if (filters?.state) {
      sql += ` AND state = ?`;
      bindings.push(filters.state);
    }
    if (filters?.visibility) {
      sql += ` AND visibility = ?`;
      bindings.push(filters.visibility);
    }

    sql += ` ORDER BY title ASC LIMIT ?`;
    bindings.push(filters?.limit || 100);

    const { results } = await this.db.prepare(sql).bind(...bindings).all();
    return (results || []).map((r) => this.mapRowToCapability(r));
  }

  async updateCapability(ownerId: EntityId, id: EntityId, params: UpdateCapabilityParams): Promise<CapabilityEntity> {
    const existing = await this.getCapabilityById(ownerId, id);
    if (!existing) throw new Error('Capability not found');

    if (existing.versionNo !== params.versionNo) {
      throw new Error('OPTIMISTIC_CONCURRENCY_CONFLICT: Version mismatch');
    }

    const now = new Date().toISOString() as ISODateTime;
    const newVersion = existing.versionNo + 1;

    const res = await this.db.prepare(`
      UPDATE capabilities
      SET title = COALESCE(?, title),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          outcome_statement = COALESCE(?, outcome_statement),
          visibility = COALESCE(?, visibility),
          state = COALESCE(?, state),
          lifecycle_state = COALESCE(?, lifecycle_state),
          archived_at = ?,
          updated_at = ?,
          version_no = ?
      WHERE id = ? AND owner_id = ? AND version_no = ?
    `).bind(
      params.title || null,
      params.slug || null,
      params.description || null,
      params.outcomeStatement || null,
      params.visibility || null,
      params.state || null,
      params.lifecycleState || null,
      params.archivedAt || null,
      now,
      newVersion,
      id,
      ownerId,
      params.versionNo,
    ).run();

    if (res.meta.changes === 0) {
      throw new Error('OPTIMISTIC_CONCURRENCY_CONFLICT: Concurrent edit detected');
    }

    const updated = await this.getCapabilityById(ownerId, id);
    if (!updated) throw new Error('Capability update failed');
    return updated;
  }

  private mapRowToCapability(row: Record<string, unknown>): CapabilityEntity {
    return {
      id: row.id as EntityId,
      ownerId: row.owner_id as EntityId,
      title: row.title as string,
      slug: row.slug as string,
      description: (row.description as string) || '',
      outcomeStatement: (row.outcome_statement as string) || '',
      maturity: (row.maturity as CapabilityEntity['maturity']) || 'not_enough_evidence',
      maturityRationale: (row.maturity_rationale as string) || '',
      maturityRuleVersion: (row.maturity_rule_version as string) || 'v1.0',
      qualifyingEvidenceRules: (row.qualifying_evidence_rules as string) || '{}',
      visibility: (row.visibility as CapabilityEntity['visibility']) || 'private',
      state: (row.state as CapabilityEntity['state']) || 'draft',
      lifecycleState: (row.lifecycle_state as CapabilityEntity['lifecycleState']) || 'active',
      ownerConfirmed: Boolean(row.owner_confirmed),
      firstDemonstratedAt: (row.first_demonstrated_at as ISODateTime) || null,
      lastDemonstratedAt: (row.last_demonstrated_at as ISODateTime) || null,
      provenanceMetadata: (row.provenance_metadata as string) || '{}',
      skillIds: [],
      lastReviewedAt: (row.last_reviewed_at as CapabilityEntity['lastReviewedAt']) || null,
      createdAt: row.created_at as ISODateTime,
      updatedAt: row.updated_at as ISODateTime,
      archivedAt: (row.archived_at as ISODateTime) || null,
      versionNo: (row.version_no as number) || 1,
    };
  }
}
