/**
 * D1 Résumé Repository — Milestone M7 Résumé Variants, Sections, Items & Versions
 *
 * SECURITY: Private variants require AuthorizationContext. Public routes access only published variants.
 * Versioning is IMMUTABLE: Rollbacks create NEW versions rather than mutating history.
 */

import type { AuthorizationContext } from '@usmanalii/authorization';
import { requireOwnerContext } from '@usmanalii/authorization';
import type {
  ResumeVariantEntity,
  ResumeVariantVersionEntity,
  EntityId,
  ISODateTime,
  Visibility,
  ResumeState,
  ResumeTargetAudience,
  ResumeSectionKey,
} from '@usmanalii/domain';
import type {
  PublicResumeVariantDto,
  CreateResumeVariantRequest,
  UpdateResumeVariantRequest,
} from '@usmanalii/contracts';

interface RawVariantRow {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  private_description: string | null;
  target_audience: string;
  template: string;
  visibility: string;
  state: string;
  is_primary: number;
  presentation_config: string;
  version_no: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface RawSectionRow {
  id: string;
  variant_id: string;
  owner_id: string;
  section_key: string;
  title: string;
  included: number;
  ordering: number;
  custom_heading: string | null;
  config_json: string;
  created_at: string;
  updated_at: string;
}

interface RawItemRow {
  id: string;
  variant_id: string;
  section_id: string;
  owner_id: string;
  item_type: string;
  item_id: string;
  custom_wording: string | null;
  included: number;
  ordering: number;
  created_at: string;
  updated_at: string;
}

interface RawVersionRow {
  id: string;
  variant_id: string;
  owner_id: string;
  version_no: number;
  snapshot_json: string;
  change_summary: string | null;
  created_at: string;
}

function mapVariantRow(row: RawVariantRow): ResumeVariantEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    title: row.title,
    slug: row.slug,
    privateDescription: row.private_description ?? null,
    targetAudience: row.target_audience as ResumeTargetAudience,
    template: row.template,
    visibility: row.visibility as Visibility,
    state: row.state as ResumeState,
    isPrimary: Boolean(row.is_primary),
    presentationConfig: row.presentation_config,
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

const DEFAULT_SECTIONS: { key: ResumeSectionKey; title: string; ordering: number }[] = [
  { key: 'summary', title: 'Professional Summary', ordering: 1 },
  { key: 'experience', title: 'Work Experience', ordering: 2 },
  { key: 'education', title: 'Education', ordering: 3 },
  { key: 'credentials', title: 'Certifications & Credentials', ordering: 4 },
  { key: 'claims', title: 'Key Achievements & Claims', ordering: 5 },
  { key: 'skills', title: 'Technical Skills & Capabilities', ordering: 6 },
  { key: 'projects', title: 'Featured Projects', ordering: 7 },
];

export class D1ResumeRepository {
  constructor(private readonly db: D1Database) {}

  async listOwnerResumeVariants(
    ctx: AuthorizationContext,
  ): Promise<readonly ResumeVariantEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM resume_variants WHERE owner_id = ? AND archived_at IS NULL ORDER BY is_primary DESC, created_at DESC',
      )
      .bind(ctx.ownerId)
      .all<RawVariantRow>();

    return (results ?? []).map(mapVariantRow);
  }

  async listPublicResumeVariants(): Promise<readonly PublicResumeVariantDto[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM resume_variants
         WHERE visibility = 'public' AND state = 'published' AND archived_at IS NULL
         ORDER BY is_primary DESC, updated_at DESC`,
      )
      .all<RawVariantRow>();

    const dtos: PublicResumeVariantDto[] = [];
    for (const row of results ?? []) {
      const dto = await this.buildPublicVariantDto(row.id);
      if (dto) dtos.push(dto);
    }
    return dtos;
  }

  async getResumeVariantByIdOrSlug(
    ctx: AuthorizationContext,
    idOrSlug: string,
  ): Promise<ResumeVariantEntity | null> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const row = await this.db
      .prepare('SELECT * FROM resume_variants WHERE (id = ? OR slug = ?) AND owner_id = ?')
      .bind(idOrSlug, idOrSlug, ctx.ownerId)
      .first<RawVariantRow>();

    if (!row) return null;
    return mapVariantRow(row);
  }

  async getPublicResumeVariantBySlug(slug: string): Promise<PublicResumeVariantDto | null> {
    const row = await this.db
      .prepare(
        `SELECT id FROM resume_variants
         WHERE (slug = ? OR id = ?) AND visibility = 'public' AND state = 'published' AND archived_at IS NULL`,
      )
      .bind(slug, slug)
      .first<{ id: string }>();

    if (!row) return null;
    return this.buildPublicVariantDto(row.id);
  }

  async createResumeVariant(
    ctx: AuthorizationContext,
    input: CreateResumeVariantRequest,
  ): Promise<ResumeVariantEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO resume_variants (
          id, owner_id, title, slug, private_description, target_audience,
          template, visibility, state, is_primary, presentation_config, version_no,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, '{}', 1, ?, ?)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.title,
        input.slug,
        input.privateDescription ?? null,
        input.targetAudience || 'general',
        input.template || 'classic',
        input.visibility || 'private',
        now,
        now,
      )
      .run();

    // Create default sections
    for (const sec of DEFAULT_SECTIONS) {
      const sectionId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO resume_variant_sections (
            id, variant_id, owner_id, section_key, title, included, ordering, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, '{}', ?, ?)`,
        )
        .bind(sectionId, id, ctx.ownerId, sec.key, sec.title, sec.ordering, now, now)
        .run();
    }

    const created = await this.getResumeVariantByIdOrSlug(ctx, id);
    if (!created) throw new Error('RESUME_VARIANT_CREATE_FAILED');
    return created;
  }

  async updateResumeVariant(
    ctx: AuthorizationContext,
    id: string,
    updates: UpdateResumeVariantRequest,
  ): Promise<ResumeVariantEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const existing = await this.getResumeVariantByIdOrSlug(ctx, id);
    if (!existing) throw new Error('RESUME_VARIANT_NOT_FOUND');
    if (existing.versionNo !== updates.versionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Résumé variant modified by another request');
    }

    const now = new Date().toISOString();
    const newVersionNo = updates.versionNo + 1;

    if (updates.isPrimary) {
      await this.db
        .prepare('UPDATE resume_variants SET is_primary = 0 WHERE owner_id = ?')
        .bind(ctx.ownerId)
        .run();
    }

    const res = await this.db
      .prepare(
        `UPDATE resume_variants SET
          title = ?, slug = ?, private_description = ?, target_audience = ?,
          template = ?, visibility = ?, state = ?, is_primary = ?,
          presentation_config = ?, updated_at = ?, version_no = ?
        WHERE id = ? AND owner_id = ? AND version_no = ?`,
      )
      .bind(
        updates.title ?? existing.title,
        updates.slug ?? existing.slug,
        updates.privateDescription !== undefined
          ? updates.privateDescription
          : existing.privateDescription,
        updates.targetAudience ?? existing.targetAudience,
        updates.template ?? existing.template,
        updates.visibility ?? existing.visibility,
        updates.state ?? existing.state,
        updates.isPrimary !== undefined ? (updates.isPrimary ? 1 : 0) : existing.isPrimary ? 1 : 0,
        updates.presentationConfig ?? existing.presentationConfig,
        now,
        newVersionNo,
        id,
        ctx.ownerId,
        updates.versionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Variant update failed');
    }

    const updated = await this.getResumeVariantByIdOrSlug(ctx, id);
    if (!updated) throw new Error('RESUME_VARIANT_FETCH_FAILED');
    return updated;
  }

  async publishResumeVariant(ctx: AuthorizationContext, id: string): Promise<ResumeVariantEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const variant = await this.getResumeVariantByIdOrSlug(ctx, id);
    if (!variant) throw new Error('RESUME_VARIANT_NOT_FOUND');

    const fullSnapshot = await this.buildPublicVariantDto(id);
    const now = new Date().toISOString();
    const versionId = crypto.randomUUID();

    // Create immutable version record
    await this.db
      .prepare(
        `INSERT INTO resume_variant_versions (
          id, variant_id, owner_id, version_no, snapshot_json, change_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, 'Owner published variant', ?)`,
      )
      .bind(versionId, id, ctx.ownerId, variant.versionNo, JSON.stringify(fullSnapshot), now)
      .run();

    return this.updateResumeVariant(ctx, id, {
      versionNo: variant.versionNo,
      state: 'published',
    });
  }

  async rollbackResumeVariant(
    ctx: AuthorizationContext,
    id: string,
    targetVersionNo: number,
  ): Promise<ResumeVariantEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const variant = await this.getResumeVariantByIdOrSlug(ctx, id);
    if (!variant) throw new Error('RESUME_VARIANT_NOT_FOUND');

    const versionRow = await this.db
      .prepare(
        'SELECT * FROM resume_variant_versions WHERE variant_id = ? AND version_no = ? AND owner_id = ?',
      )
      .bind(id, targetVersionNo, ctx.ownerId)
      .first<RawVersionRow>();

    if (!versionRow) throw new Error('RESUME_VERSION_NOT_FOUND');

    const now = new Date().toISOString();
    const newVersionNo = variant.versionNo + 1;
    const newVersionId = crypto.randomUUID();

    // IMMUTABILITY INVARIANT: Rollback appends a new version rather than mutating history
    await this.db
      .prepare(
        `INSERT INTO resume_variant_versions (
          id, variant_id, owner_id, version_no, snapshot_json, change_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newVersionId,
        id,
        ctx.ownerId,
        newVersionNo,
        versionRow.snapshot_json,
        `Rollback to version ${targetVersionNo}`,
        now,
      )
      .run();

    return this.updateResumeVariant(ctx, id, {
      versionNo: variant.versionNo,
      state: 'published',
    });
  }

  async listVariantVersions(
    ctx: AuthorizationContext,
    variantId: string,
  ): Promise<readonly ResumeVariantVersionEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM resume_variant_versions WHERE variant_id = ? AND owner_id = ? ORDER BY version_no DESC',
      )
      .bind(variantId, ctx.ownerId)
      .all<RawVersionRow>();

    return (results ?? []).map((row) => ({
      id: row.id as EntityId,
      variantId: row.variant_id as EntityId,
      ownerId: row.owner_id as EntityId,
      versionNo: Number(row.version_no),
      snapshotJson: row.snapshot_json,
      changeSummary: row.change_summary ?? null,
      createdAt: row.created_at as ISODateTime,
    }));
  }

  private async buildPublicVariantDto(variantId: string): Promise<PublicResumeVariantDto | null> {
    const variantRow = await this.db
      .prepare('SELECT * FROM resume_variants WHERE id = ?')
      .bind(variantId)
      .first<RawVariantRow>();

    if (!variantRow) return null;

    const { results: sectionRows } = await this.db
      .prepare(
        'SELECT * FROM resume_variant_sections WHERE variant_id = ? AND included = 1 ORDER BY ordering ASC',
      )
      .bind(variantId)
      .all<RawSectionRow>();

    const sections = [];
    for (const secRow of sectionRows ?? []) {
      const { results: itemRows } = await this.db
        .prepare(
          'SELECT * FROM resume_variant_items WHERE section_id = ? AND included = 1 ORDER BY ordering ASC',
        )
        .bind(secRow.id)
        .all<RawItemRow>();

      sections.push({
        id: secRow.id,
        sectionKey: secRow.section_key,
        title: secRow.title,
        customHeading: secRow.custom_heading ?? null,
        ordering: Number(secRow.ordering),
        items: (itemRows ?? []).map((i) => ({
          id: i.id,
          itemType: i.item_type,
          itemId: i.item_id,
          customWording: i.custom_wording ?? null,
          ordering: Number(i.ordering),
        })),
      });
    }

    return {
      id: variantRow.id,
      title: variantRow.title,
      slug: variantRow.slug,
      targetAudience: variantRow.target_audience,
      template: variantRow.template,
      state: variantRow.state,
      versionNo: Number(variantRow.version_no),
      sections,
    };
  }
}
