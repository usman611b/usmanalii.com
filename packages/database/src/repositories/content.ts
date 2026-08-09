import type { D1Database } from '@cloudflare/workers-types';
import type {
  ContentItemEntity,
  ContentRevisionEntity,
  ContentType,
  PublicationState,
  Visibility,
  EntityId,
  ISODateTime,
} from '@usmanalii/domain';

export interface CreateContentDraftInput {
  id: string;
  contentType: ContentType;
  title: string;
  slug: string;
  summary?: string | null;
  bodyFormat?: 'json_blocks' | 'markdown';
  bodySchemaVersion?: string;
  visibility?: Visibility;
  occurredAt?: string | null;
  scheduledFor?: string | null;
  embargoUntil?: string | null;
  bodyBlocksJson: string; // initial revision body snapshot
}

export interface UpdateContentInput {
  title?: string | undefined;
  slug?: string | undefined;
  summary?: string | null | undefined;
  visibility?: Visibility | undefined;
  occurredAt?: string | null | undefined;
  scheduledFor?: string | null | undefined;
  embargoUntil?: string | null | undefined;
  bodyBlocksJson?: string | undefined;
  revisionNote?: string | null | undefined;
}

export interface LinkedSkillRow {
  skill_id: string;
  name: string;
  slug: string;
}

export interface LinkedEntityRecord {
  id: string;
  type: 'skill' | 'capability' | 'project' | 'evidence' | 'content_item';
  visibility: Visibility;
  exists: boolean;
}

export class D1ContentRepository {
  constructor(private readonly db: D1Database) {}

  /** List all content items for an owner (private owner dashboard view) */
  async listForOwner(
    ownerId: string,
    filters?: { state?: PublicationState; contentType?: ContentType; search?: string },
  ): Promise<ContentItemEntity[]> {
    let sql = `SELECT * FROM content_items WHERE owner_id = ? AND deleted_at IS NULL`;
    const params: (string | number)[] = [ownerId];

    if (filters?.state) {
      sql += ` AND state = ?`;
      params.push(filters.state);
    }
    if (filters?.contentType) {
      sql += ` AND content_type = ?`;
      params.push(filters.contentType);
    }
    if (filters?.search) {
      sql += ` AND (title LIKE ? OR summary LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ` ORDER BY updated_at DESC`;

    const stmt = this.db.prepare(sql).bind(...params);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => this.mapRowToEntity(row));
  }

  /** Find single content item by ID for owner */
  async findById(
    ownerId: string,
    id: string,
  ): Promise<{ item: ContentItemEntity; latestBodySnapshot: string | null } | null> {
    const itemStmt = this.db
      .prepare(`SELECT * FROM content_items WHERE owner_id = ? AND id = ? AND deleted_at IS NULL`)
      .bind(ownerId, id);

    const row = await itemStmt.first<Record<string, unknown>>();
    if (!row) return null;

    const item = this.mapRowToEntity(row);

    // Get latest revision body
    const revStmt = this.db
      .prepare(
        `SELECT body_snapshot FROM content_revisions WHERE content_item_id = ? AND owner_id = ? ORDER BY revision_no DESC LIMIT 1`,
      )
      .bind(id, ownerId);
    const revRow = await revStmt.first<{ body_snapshot: string }>();

    return {
      item,
      latestBodySnapshot: revRow ? revRow.body_snapshot : null,
    };
  }

  /** Find by slug for owner */
  async findBySlug(ownerId: string, slug: string): Promise<ContentItemEntity | null> {
    const stmt = this.db
      .prepare(`SELECT * FROM content_items WHERE owner_id = ? AND slug = ? AND deleted_at IS NULL`)
      .bind(ownerId, slug);
    const row = await stmt.first<Record<string, unknown>>();
    return row ? this.mapRowToEntity(row) : null;
  }

  /** Create new draft content item + initial revision #1 */
  async createDraft(
    ownerId: string,
    input: CreateContentDraftInput,
    createdBy: string,
  ): Promise<ContentItemEntity> {
    const now = new Date().toISOString();
    const bodyFormat = input.bodyFormat || 'json_blocks';
    const bodySchemaVersion = input.bodySchemaVersion || 'v1';
    const visibility = input.visibility || 'private';

    const insertItemStmt = this.db
      .prepare(
        `INSERT INTO content_items (
        id, owner_id, content_type, title, slug, summary,
        body_format, body_schema_version, visibility, state,
        occurred_at, scheduled_for, embargo_until, created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        input.id,
        ownerId,
        input.contentType,
        input.title,
        input.slug,
        input.summary || null,
        bodyFormat,
        bodySchemaVersion,
        visibility,
        input.occurredAt || null,
        input.scheduledFor || null,
        input.embargoUntil || null,
        now,
        now,
      );

    const revisionId = crypto.randomUUID();
    const insertRevisionStmt = this.db
      .prepare(
        `INSERT INTO content_revisions (
        id, content_item_id, owner_id, revision_no,
        body_snapshot, body_schema_version, revision_note, created_at, created_by
      ) VALUES (?, ?, ?, 1, ?, ?, 'Initial draft creation', ?, ?)`,
      )
      .bind(revisionId, input.id, ownerId, input.bodyBlocksJson, bodySchemaVersion, now, createdBy);

    await this.db.batch([insertItemStmt, insertRevisionStmt]);

    const created = await this.findById(ownerId, input.id);
    if (!created) throw new Error('Failed to retrieve newly created content item.');
    return created.item;
  }

  /** Update content item with optimistic concurrency (version_no check) */
  async updateWithConcurrency(
    ownerId: string,
    id: string,
    expectedVersionNo: number,
    input: UpdateContentInput,
    updatedBy: string,
  ): Promise<
    | { success: true; item: ContentItemEntity }
    | { success: false; reason: 'concurrency_conflict' | 'not_found' }
  > {
    const current = await this.findById(ownerId, id);
    if (!current) return { success: false, reason: 'not_found' };

    if (current.item.versionNo !== expectedVersionNo) {
      return { success: false, reason: 'concurrency_conflict' };
    }

    const now = new Date().toISOString();
    const newVersionNo = expectedVersionNo + 1;

    const newTitle = input.title ?? current.item.title;
    const newSlug = input.slug ?? current.item.slug;
    const newSummary = input.summary !== undefined ? input.summary : current.item.summary;
    const newVisibility = input.visibility ?? current.item.visibility;
    const newOccurredAt =
      input.occurredAt !== undefined ? input.occurredAt : current.item.occurredAt;
    const newScheduledFor =
      input.scheduledFor !== undefined ? input.scheduledFor : current.item.scheduledFor;
    const newEmbargoUntil =
      input.embargoUntil !== undefined ? input.embargoUntil : current.item.embargoUntil;

    const updateStmt = this.db
      .prepare(
        `UPDATE content_items SET
        title = ?,
        slug = ?,
        summary = ?,
        visibility = ?,
        occurred_at = ?,
        scheduled_for = ?,
        embargo_until = ?,
        updated_at = ?,
        version_no = ?
      WHERE id = ? AND owner_id = ? AND version_no = ? AND deleted_at IS NULL`,
      )
      .bind(
        newTitle,
        newSlug,
        newSummary,
        newVisibility,
        newOccurredAt,
        newScheduledFor,
        newEmbargoUntil,
        now,
        newVersionNo,
        id,
        ownerId,
        expectedVersionNo,
      );

    const batchStmts: D1PreparedStatement[] = [updateStmt];

    // Create new revision if bodyBlocksJson is provided
    if (input.bodyBlocksJson) {
      const maxRevStmt = this.db
        .prepare(
          `SELECT COALESCE(MAX(revision_no), 0) AS max_rev FROM content_revisions WHERE content_item_id = ? AND owner_id = ?`,
        )
        .bind(id, ownerId);
      const maxRevRow = await maxRevStmt.first<{ max_rev: number }>();
      const nextRevNo = (maxRevRow?.max_rev || 0) + 1;

      const revId = crypto.randomUUID();
      const insertRevStmt = this.db
        .prepare(
          `INSERT INTO content_revisions (
          id, content_item_id, owner_id, revision_no,
          body_snapshot, body_schema_version, revision_note, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, 'v1', ?, ?, ?)`,
        )
        .bind(
          revId,
          id,
          ownerId,
          nextRevNo,
          input.bodyBlocksJson,
          input.revisionNote || `Updated content version ${newVersionNo}`,
          now,
          updatedBy,
        );
      batchStmts.push(insertRevStmt);
    }

    const results = await this.db.batch(batchStmts);
    const updateResult = results[0];

    if (!updateResult || (updateResult.meta && updateResult.meta.changes === 0)) {
      return { success: false, reason: 'concurrency_conflict' };
    }

    const updated = await this.findById(ownerId, id);
    if (!updated) return { success: false, reason: 'not_found' };

    return { success: true, item: updated.item };
  }

  /** Update state (e.g. publish, unlist, archive) atomically with revision audit log */
  async transitionState(
    ownerId: string,
    id: string,
    targetState: PublicationState,
    publishedAt?: string | null,
    changedBy?: string,
  ): Promise<ContentItemEntity> {
    const current = await this.findById(ownerId, id);
    if (!current) throw new Error(`Content item ${id} not found for state transition.`);

    const now = new Date().toISOString();
    const newVersionNo = current.item.versionNo + 1;

    let sql = `UPDATE content_items SET state = ?, updated_at = ?, version_no = ?`;
    const params: (string | number | null)[] = [targetState, now, newVersionNo];

    if (targetState === 'published' && publishedAt !== undefined) {
      sql += `, published_at = ?`;
      params.push(publishedAt || now);
    } else if (targetState === 'archived') {
      sql += `, archived_at = ?`;
      params.push(now);
    }

    sql += ` WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`;
    params.push(id, ownerId);

    const updateStateStmt = this.db.prepare(sql).bind(...params);

    const revId = crypto.randomUUID();
    const latestBodySnapshot = current.latestBodySnapshot || '[]';

    const maxRevStmt = this.db
      .prepare(
        `SELECT COALESCE(MAX(revision_no), 0) AS max_rev FROM content_revisions WHERE content_item_id = ? AND owner_id = ?`,
      )
      .bind(id, ownerId);
    const maxRevRow = await maxRevStmt.first<{ max_rev: number }>();
    const nextRevNo = (maxRevRow?.max_rev || 0) + 1;

    const auditRevStmt = this.db
      .prepare(
        `INSERT INTO content_revisions (
        id, content_item_id, owner_id, revision_no,
        body_snapshot, body_schema_version, revision_note, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, 'v1', ?, ?, ?)`,
      )
      .bind(
        revId,
        id,
        ownerId,
        nextRevNo,
        latestBodySnapshot,
        `State transition: ${current.item.state} -> ${targetState}`,
        now,
        changedBy || 'owner',
      );

    await this.db.batch([updateStateStmt, auditRevStmt]);

    const updated = await this.findById(ownerId, id);
    if (!updated) throw new Error(`Content item ${id} not found after state transition.`);
    return updated.item;
  }

  /** Create revision rollback (creates a NEW revision snapshot from an old revision) */
  async rollbackToRevision(
    ownerId: string,
    contentItemId: string,
    sourceRevisionId: string,
    createdBy: string,
  ): Promise<ContentRevisionEntity> {
    const targetRevStmt = this.db
      .prepare(
        `SELECT * FROM content_revisions WHERE id = ? AND content_item_id = ? AND owner_id = ?`,
      )
      .bind(sourceRevisionId, contentItemId, ownerId);
    const targetRev = await targetRevStmt.first<{ body_snapshot: string; revision_no: number }>();
    if (!targetRev) throw new Error('Target revision not found for rollback.');

    const maxRevStmt = this.db
      .prepare(
        `SELECT COALESCE(MAX(revision_no), 0) AS max_rev FROM content_revisions WHERE content_item_id = ? AND owner_id = ?`,
      )
      .bind(contentItemId, ownerId);
    const maxRevRow = await maxRevStmt.first<{ max_rev: number }>();
    const nextRevNo = (maxRevRow?.max_rev || 0) + 1;

    const now = new Date().toISOString();
    const newRevId = crypto.randomUUID();

    const insertRevStmt = this.db
      .prepare(
        `INSERT INTO content_revisions (
        id, content_item_id, owner_id, revision_no,
        body_snapshot, body_schema_version, revision_note, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, 'v1', ?, ?, ?)`,
      )
      .bind(
        newRevId,
        contentItemId,
        ownerId,
        nextRevNo,
        targetRev.body_snapshot,
        `Rollback to revision #${targetRev.revision_no}`,
        now,
        createdBy,
      );

    // Also update current content_items version_no
    const updateItemStmt = this.db
      .prepare(
        `UPDATE content_items SET updated_at = ?, version_no = version_no + 1 WHERE id = ? AND owner_id = ?`,
      )
      .bind(now, contentItemId, ownerId);

    await this.db.batch([insertRevStmt, updateItemStmt]);

    return {
      id: newRevId as unknown as EntityId,
      contentItemId: contentItemId as unknown as EntityId,
      ownerId: ownerId as unknown as EntityId,
      revisionNo: nextRevNo,
      bodySnapshot: targetRev.body_snapshot,
      bodySchemaVersion: 'v1',
      revisionNote: `Rollback to revision #${targetRev.revision_no}`,
      createdAt: now as unknown as ISODateTime,
      createdBy,
    };
  }

  /** List all revisions for an item */
  async listRevisions(ownerId: string, contentItemId: string): Promise<ContentRevisionEntity[]> {
    const stmt = this.db
      .prepare(
        `SELECT * FROM content_revisions WHERE content_item_id = ? AND owner_id = ? ORDER BY revision_no DESC`,
      )
      .bind(contentItemId, ownerId);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => ({
      id: String(row.id) as unknown as EntityId,
      contentItemId: String(row.content_item_id) as unknown as EntityId,
      ownerId: String(row.owner_id) as unknown as EntityId,
      revisionNo: Number(row.revision_no),
      bodySnapshot: String(row.body_snapshot),
      bodySchemaVersion: String(row.body_schema_version),
      revisionNote: row.revision_note ? String(row.revision_note) : null,
      createdAt: String(row.created_at) as unknown as ISODateTime,
      createdBy: String(row.created_by),
    }));
  }

  /** Public allowlisted query for public Journey pages with scheduled_for & embargo_until enforcement */
  async getPublicPublishedEntries(filters?: {
    contentType?: ContentType;
    yearMonth?: string;
  }): Promise<ContentItemEntity[]> {
    const now = new Date().toISOString();
    let sql = `SELECT * FROM content_items WHERE state = 'published' AND visibility = 'public' AND deleted_at IS NULL AND archived_at IS NULL AND (scheduled_for IS NULL OR scheduled_for <= ?) AND (embargo_until IS NULL OR embargo_until <= ?)`;
    const params: string[] = [now, now];

    if (filters?.contentType) {
      sql += ` AND content_type = ?`;
      params.push(filters.contentType);
    }
    if (filters?.yearMonth && /^\d{4}-\d{2}$/.test(filters.yearMonth)) {
      sql += ` AND occurred_at LIKE ?`;
      params.push(`${filters.yearMonth}%`);
    }

    sql += ` ORDER BY occurred_at DESC, created_at DESC`;

    const stmt = this.db.prepare(sql).bind(...params);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => this.mapRowToEntity(row));
  }

  /** Get single public published entry by slug with scheduled_for & embargo_until enforcement */
  async getPublicPublishedEntryBySlug(
    slug: string,
  ): Promise<{ item: ContentItemEntity; bodySnapshot: string | null } | null> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `SELECT * FROM content_items WHERE slug = ? AND state = 'published' AND visibility = 'public' AND deleted_at IS NULL AND archived_at IS NULL AND (scheduled_for IS NULL OR scheduled_for <= ?) AND (embargo_until IS NULL OR embargo_until <= ?)`,
      )
      .bind(slug, now, now);
    const row = await stmt.first<Record<string, unknown>>();
    if (!row) return null;

    const item = this.mapRowToEntity(row);

    const revStmt = this.db
      .prepare(
        `SELECT body_snapshot FROM content_revisions WHERE content_item_id = ? ORDER BY revision_no DESC LIMIT 1`,
      )
      .bind(item.id);
    const revRow = await revStmt.first<{ body_snapshot: string }>();

    return {
      item,
      bodySnapshot: revRow ? revRow.body_snapshot : null,
    };
  }

  /** Fetch status/visibility of linked entities for publication validation */
  async getLinkedEntitiesStatus(
    ownerId: string,
    skillIds: string[],
    capabilityIds: string[],
    evidenceIds: string[],
  ): Promise<LinkedEntityRecord[]> {
    const records: LinkedEntityRecord[] = [];

    for (const id of skillIds) {
      const stmt = this.db
        .prepare(
          `SELECT visibility FROM skills WHERE owner_id = ? AND id = ? AND archived_at IS NULL`,
        )
        .bind(ownerId, id);
      const row = await stmt.first<{ visibility: Visibility }>();
      records.push({
        id,
        type: 'skill',
        visibility: row ? row.visibility : 'private',
        exists: !!row,
      });
    }

    for (const id of capabilityIds) {
      const stmt = this.db
        .prepare(
          `SELECT visibility FROM capabilities WHERE owner_id = ? AND id = ? AND archived_at IS NULL`,
        )
        .bind(ownerId, id);
      const row = await stmt.first<{ visibility: Visibility }>();
      records.push({
        id,
        type: 'capability',
        visibility: row ? row.visibility : 'private',
        exists: !!row,
      });
    }

    for (const id of evidenceIds) {
      const stmt = this.db
        .prepare(
          `SELECT visibility FROM evidence_items WHERE owner_id = ? AND id = ? AND archived_at IS NULL`,
        )
        .bind(ownerId, id);
      const row = await stmt.first<{ visibility: Visibility }>();
      records.push({
        id,
        type: 'evidence',
        visibility: row ? row.visibility : 'private',
        exists: !!row,
      });
    }

    return records;
  }

  private mapRowToEntity(row: Record<string, unknown>): ContentItemEntity {
    return {
      id: String(row.id) as unknown as EntityId,
      ownerId: String(row.owner_id) as unknown as EntityId,
      contentType: row.content_type as ContentType,
      title: String(row.title),
      slug: String(row.slug),
      summary: row.summary ? String(row.summary) : null,
      bodyFormat: (row.body_format as 'json_blocks' | 'markdown') || 'json_blocks',
      bodySchemaVersion: String(row.body_schema_version || 'v1'),
      readingTimeMinutes: row.reading_time_minutes ? Number(row.reading_time_minutes) : null,
      visibility: row.visibility as Visibility,
      state: row.state as PublicationState,
      occurredAt: row.occurred_at ? (String(row.occurred_at) as unknown as ISODateTime) : null,
      publishedAt: row.published_at ? (String(row.published_at) as unknown as ISODateTime) : null,
      scheduledFor: row.scheduled_for
        ? (String(row.scheduled_for) as unknown as ISODateTime)
        : null,
      embargoUntil: row.embargo_until
        ? (String(row.embargo_until) as unknown as ISODateTime)
        : null,
      createdAt: String(row.created_at) as unknown as ISODateTime,
      updatedAt: String(row.updated_at) as unknown as ISODateTime,
      archivedAt: row.archived_at ? (String(row.archived_at) as unknown as ISODateTime) : null,
      deletedAt: row.deleted_at ? (String(row.deleted_at) as unknown as ISODateTime) : null,
      versionNo: Number(row.version_no || 1),
    };
  }
}
