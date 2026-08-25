import type { D1Database } from '@cloudflare/workers-types';
import type { SkillEntity, EntityId, ISODateTime } from '@usmanalii/domain';

export interface CreateSkillParams {
  id: EntityId;
  ownerId: EntityId;
  name: string;
  slug: string;
  description?: string | null;
  aliases?: readonly string[];
  parentId?: EntityId | null;
  category?: string;
  skillType?: string;
  visibility?: 'private' | 'restricted' | 'unlisted' | 'public';
  lifecycleState?: 'draft' | 'active' | 'deprecated' | 'archived';
  externalIdentifier?: string | null;
  provenanceMetadata?: string;
}

export interface UpdateSkillParams {
  name?: string;
  slug?: string;
  description?: string | null;
  aliases?: readonly string[];
  parentId?: EntityId | null;
  category?: string;
  skillType?: string;
  visibility?: 'private' | 'restricted' | 'unlisted' | 'public';
  lifecycleState?: 'draft' | 'active' | 'deprecated' | 'archived';
  firstObservedAt?: ISODateTime | null;
  lastDemonstratedAt?: ISODateTime | null;
  ownerConfirmed?: boolean;
  externalIdentifier?: string | null;
  provenanceMetadata?: string;
  archivedAt?: ISODateTime | null;
  versionNo: number;
}

export class D1SkillRepository {
  constructor(private readonly db: D1Database) {}

  async createSkill(params: CreateSkillParams): Promise<SkillEntity> {
    const now = new Date().toISOString() as ISODateTime;
    const stmt = this.db.prepare(`
      INSERT INTO skills (
        id, owner_id, name, slug, description, parent_id, aliases, visibility,
        category, skill_type, lifecycle_state, owner_confirmed, external_identifier,
        provenance_metadata, created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)
    `);

    await stmt
      .bind(
        params.id,
        params.ownerId,
        params.name,
        params.slug,
        params.description || null,
        params.parentId || null,
        JSON.stringify(params.aliases || []),
        params.visibility || 'private',
        params.category || 'engineering_practice',
        params.skillType || 'technical',
        params.lifecycleState || 'active',
        params.externalIdentifier || null,
        params.provenanceMetadata || '{}',
        now,
        now,
      )
      .run();

    const created = await this.getSkillById(params.ownerId, params.id);
    if (!created) throw new Error('Skill creation failed');
    return created;
  }

  async getSkillById(ownerId: EntityId, id: EntityId): Promise<SkillEntity | null> {
    const row = await this.db
      .prepare(
        `
      SELECT * FROM skills WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(id, ownerId)
      .first();

    if (!row) return null;
    return this.mapRowToSkill(row);
  }

  async getSkillBySlug(ownerId: EntityId, slug: string): Promise<SkillEntity | null> {
    const row = await this.db
      .prepare(
        `
      SELECT * FROM skills WHERE slug = ? AND owner_id = ?
    `,
      )
      .bind(slug, ownerId)
      .first();

    if (!row) return null;
    return this.mapRowToSkill(row);
  }

  async listSkillsByOwner(
    ownerId: EntityId,
    filters?: { category?: string; visibility?: string; limit?: number; cursor?: string },
  ): Promise<readonly SkillEntity[]> {
    let sql = `SELECT * FROM skills WHERE owner_id = ? AND archived_at IS NULL`;
    const bindings: unknown[] = [ownerId];

    if (filters?.category) {
      sql += ` AND category = ?`;
      bindings.push(filters.category);
    }
    if (filters?.visibility) {
      sql += ` AND visibility = ?`;
      bindings.push(filters.visibility);
    }

    sql += ` ORDER BY name ASC LIMIT ?`;
    bindings.push(filters?.limit || 100);

    const { results } = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all();
    return (results || []).map((r) => this.mapRowToSkill(r));
  }

  async updateSkill(
    ownerId: EntityId,
    id: EntityId,
    params: UpdateSkillParams,
  ): Promise<SkillEntity> {
    const existing = await this.getSkillById(ownerId, id);
    if (!existing) throw new Error('Skill not found');

    if (existing.versionNo !== params.versionNo) {
      throw new Error('OPTIMISTIC_CONCURRENCY_CONFLICT: Version mismatch');
    }

    const now = new Date().toISOString() as ISODateTime;
    const newVersion = existing.versionNo + 1;

    const res = await this.db
      .prepare(
        `
      UPDATE skills
      SET name = ?,
          slug = ?,
          description = ?,
          parent_id = ?,
          aliases = ?,
          category = ?,
          skill_type = ?,
          visibility = ?,
          lifecycle_state = ?,
          first_observed_at = ?,
          last_demonstrated_at = ?,
          owner_confirmed = ?,
          external_identifier = ?,
          provenance_metadata = ?,
          archived_at = ?,
          updated_at = ?,
          version_no = ?
      WHERE id = ? AND owner_id = ? AND version_no = ?
    `,
      )
      .bind(
        params.name ?? existing.name,
        params.slug ?? existing.slug,
        params.description !== undefined ? params.description : existing.description,
        params.parentId !== undefined ? params.parentId : existing.parentId,
        JSON.stringify(params.aliases ?? existing.aliases),
        params.category ?? existing.category ?? 'engineering_practice',
        params.skillType ?? existing.skillType ?? 'technical',
        params.visibility ?? existing.visibility,
        params.lifecycleState ?? existing.lifecycleState ?? 'active',
        params.firstObservedAt !== undefined ? params.firstObservedAt : existing.firstObservedAt,
        params.lastDemonstratedAt !== undefined
          ? params.lastDemonstratedAt
          : existing.lastDemonstratedAt,
        params.ownerConfirmed !== undefined
          ? params.ownerConfirmed
            ? 1
            : 0
          : existing.ownerConfirmed === false
            ? 0
            : 1,
        params.externalIdentifier !== undefined
          ? params.externalIdentifier
          : existing.externalIdentifier,
        params.provenanceMetadata ?? existing.provenanceMetadata ?? '{}',
        params.archivedAt !== undefined ? params.archivedAt : existing.archivedAt,
        now,
        newVersion,
        id,
        ownerId,
        params.versionNo,
      )
      .run();

    if (res.meta.changes === 0) {
      throw new Error('OPTIMISTIC_CONCURRENCY_CONFLICT: Concurrent edit detected');
    }

    const updated = await this.getSkillById(ownerId, id);
    if (!updated) throw new Error('Skill update failed');
    return updated;
  }

  private mapRowToSkill(row: Record<string, unknown>): SkillEntity {
    let aliases: string[] = [];
    try {
      aliases = JSON.parse((row.aliases as string) || '[]');
    } catch {
      aliases = [];
    }

    return {
      id: row.id as EntityId,
      ownerId: row.owner_id as EntityId,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string) || null,
      parentId: (row.parent_id as EntityId) || null,
      aliases,
      visibility: (row.visibility as SkillEntity['visibility']) || 'private',
      category: (row.category as string) || 'engineering_practice',
      skillType: (row.skill_type as string) || 'technical',
      lifecycleState: (row.lifecycle_state as SkillEntity['lifecycleState']) || 'active',
      firstObservedAt: (row.first_observed_at as ISODateTime) || null,
      lastDemonstratedAt: (row.last_demonstrated_at as ISODateTime) || null,
      ownerConfirmed: Number(row.owner_confirmed ?? 1) === 1,
      externalIdentifier: (row.external_identifier as string) || null,
      provenanceMetadata: (row.provenance_metadata as string) || '{}',
      createdAt: row.created_at as ISODateTime,
      updatedAt: row.updated_at as ISODateTime,
      archivedAt: (row.archived_at as ISODateTime) || null,
      versionNo: (row.version_no as number) || 1,
    };
  }
}
