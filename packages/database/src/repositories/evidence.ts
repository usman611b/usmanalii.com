import type { D1Database } from '@cloudflare/workers-types';
import type {
  EvidenceItemEntity,
  EvidenceVerificationEventEntity,
  EvidenceLinkEntity,
  EvidenceLinkTarget,
  EvidenceLinkApprovalState,
  ArtifactEntity,
  EvidenceType,
  EvidenceSourceType,
  EvidenceVerificationState,
  EvidenceSupportType,
  Visibility,
  EntityId,
  ISODateTime,
} from '@usmanalii/domain';

export interface CreateEvidenceInput {
  id: string;
  evidenceType: EvidenceType;
  sourceType: EvidenceSourceType;
  provider?: string | null;
  externalId?: string | null;
  canonicalLocator?: string | null;
  title: string;
  description?: string | null;
  occurredAt?: string | null;
  visibility?: Visibility;
  embargoUntil?: string | null;
  provenanceSnapshot?: string | null;
  authorshipNote?: string | null;
}

export interface UpdateEvidenceInput {
  evidenceType?: EvidenceType;
  sourceType?: EvidenceSourceType;
  provider?: string | null;
  externalId?: string | null;
  title?: string;
  description?: string | null;
  occurredAt?: string | null;
  authorshipNote?: string | null;
  provenanceSnapshot?: string | null;
  visibility?: Visibility;
  embargoUntil?: string | null;
  canonicalLocator?: string | null;
}

export interface CreateEvidenceLinkInput {
  id: string;
  targetType:
    | 'capability'
    | 'claim'
    | 'project'
    | 'content_item'
    | 'artifact'
    | 'adr'
    | 'experiment'
    | 'debugging_lesson'
    | 'deployment'
    | 'resume_statement';
  targetId: string;
  supportType: EvidenceSupportType;
  relevance?: number;
  ordering?: number;
  rationale: string;
  provenance?: string | null;
}

export interface CreateArtifactInput {
  id: string;
  title: string;
  description?: string | null;
  artifactType: string;
  mediaType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  r2Key: string;
  originalName?: string | null;
  uploadedBy?: string | null;
  visibility?: Visibility;
}

export class D1EvidenceRepository {
  constructor(private readonly db: D1Database) {}

  /** List evidence items for private owner dashboard */
  async listForOwner(
    ownerId: string,
    filters?: {
      evidenceType?: string;
      verificationState?: string;
      visibility?: string;
      sourceType?: string;
      search?: string;
    },
  ): Promise<EvidenceItemEntity[]> {
    let sql = 'SELECT * FROM evidence_items WHERE owner_id = ?';
    const params: (string | number)[] = [ownerId];

    if (filters?.evidenceType) {
      sql += ' AND evidence_type = ?';
      params.push(filters.evidenceType);
    }
    if (filters?.verificationState) {
      sql += ' AND verification_state = ?';
      params.push(filters.verificationState);
    }
    if (filters?.visibility) {
      sql += ' AND visibility = ?';
      params.push(filters.visibility);
    }
    if (filters?.sourceType) {
      sql += ' AND source_type = ?';
      params.push(filters.sourceType);
    }
    if (filters?.search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY captured_at DESC, created_at DESC';

    const stmt = this.db.prepare(sql).bind(...params);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => this.mapRowToEvidenceEntity(row));
  }

  /** Find single evidence item by ID and owner */
  async findById(ownerId: string, id: string): Promise<EvidenceItemEntity | null> {
    const stmt = this.db
      .prepare('SELECT * FROM evidence_items WHERE owner_id = ? AND id = ?')
      .bind(ownerId, id);
    const row = await stmt.first<Record<string, unknown>>();
    return row ? this.mapRowToEvidenceEntity(row) : null;
  }

  /** Create new evidence item */
  async create(ownerId: string, input: CreateEvidenceInput): Promise<EvidenceItemEntity> {
    const now = new Date().toISOString();
    const visibility = input.visibility || 'private';

    const stmt = this.db
      .prepare(
        `
      INSERT INTO evidence_items (
        id, owner_id, evidence_type, source_type, provider, external_id,
        canonical_locator, title, description, captured_at, occurred_at,
        authorship_note, provenance_snapshot, verification_state, visibility,
        embargo_until, created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?, ?, 1)
    `,
      )
      .bind(
        input.id,
        ownerId,
        input.evidenceType,
        input.sourceType,
        input.provider || null,
        input.externalId || null,
        input.canonicalLocator || null,
        input.title,
        input.description || null,
        now,
        input.occurredAt || now,
        input.authorshipNote || null,
        input.provenanceSnapshot || null,
        visibility,
        input.embargoUntil || null,
        now,
        now,
      );

    await stmt.run();

    const created = await this.findById(ownerId, input.id);
    if (!created) {
      throw new Error(`Failed to read back created evidence item: ${input.id}`);
    }
    return created;
  }

  /** Update evidence item with optimistic concurrency control (`version_no`) */
  async updateWithConcurrency(
    ownerId: string,
    id: string,
    expectedVersionNo: number,
    input: UpdateEvidenceInput,
  ): Promise<
    | { success: true; item: EvidenceItemEntity }
    | { success: false; reason: 'concurrency_conflict' | 'not_found' }
  > {
    const existing = await this.findById(ownerId, id);
    if (!existing) {
      return { success: false, reason: 'not_found' };
    }
    if (existing.versionNo !== expectedVersionNo) {
      return { success: false, reason: 'concurrency_conflict' };
    }

    const now = new Date().toISOString();
    const newVersionNo = expectedVersionNo + 1;
    const newEvidenceType = input.evidenceType ?? existing.evidenceType;
    const newSourceType = input.sourceType ?? existing.sourceType;
    const newProvider = input.provider !== undefined ? input.provider : existing.provider;
    const newExternalId = input.externalId !== undefined ? input.externalId : existing.externalId;
    const newTitle = input.title ?? existing.title;
    const newDesc = input.description !== undefined ? input.description : existing.description;
    const newOccurredAt = input.occurredAt !== undefined ? input.occurredAt : existing.occurredAt;
    const newAuthorshipNote =
      input.authorshipNote !== undefined ? input.authorshipNote : existing.authorshipNote;
    const newProvenanceSnapshot =
      input.provenanceSnapshot !== undefined
        ? input.provenanceSnapshot
        : existing.provenanceSnapshot;
    const newVis = input.visibility ?? existing.visibility;
    const newEmbargo =
      input.embargoUntil !== undefined ? input.embargoUntil : existing.embargoUntil;
    const newLocator =
      input.canonicalLocator !== undefined ? input.canonicalLocator : existing.canonicalLocator;

    const updateStmt = this.db
      .prepare(
        `
      UPDATE evidence_items SET
        evidence_type = ?,
        source_type = ?,
        provider = ?,
        external_id = ?,
        title = ?,
        description = ?,
        occurred_at = ?,
        authorship_note = ?,
        provenance_snapshot = ?,
        visibility = ?,
        embargo_until = ?,
        canonical_locator = ?,
        updated_at = ?,
        version_no = ?
      WHERE id = ? AND owner_id = ? AND version_no = ?
    `,
      )
      .bind(
        newEvidenceType,
        newSourceType,
        newProvider,
        newExternalId,
        newTitle,
        newDesc,
        newOccurredAt,
        newAuthorshipNote,
        newProvenanceSnapshot,
        newVis,
        newEmbargo,
        newLocator,
        now,
        newVersionNo,
        id,
        ownerId,
        expectedVersionNo,
      );

    const res = await updateStmt.run();
    if (!res.meta.changes || res.meta.changes === 0) {
      return { success: false, reason: 'concurrency_conflict' };
    }

    const updated = await this.findById(ownerId, id);
    if (!updated) throw new Error(`Evidence item lost after update: ${id}`);

    return { success: true, item: updated };
  }

  /** Atomically update verification state and record append-only verification event */
  async recordVerificationEvent(
    ownerId: string,
    evidenceItemId: string,
    newState: EvidenceVerificationState,
    verificationMethod: string,
    verifierIdentity: string,
    rationale?: string | null,
  ): Promise<{ evidenceItem: EvidenceItemEntity; event: EvidenceVerificationEventEntity }> {
    const existing = await this.findById(ownerId, evidenceItemId);
    if (!existing) {
      throw new Error(`Evidence item not found: ${evidenceItemId}`);
    }

    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();

    const updateItemStmt = this.db
      .prepare(
        `
      UPDATE evidence_items SET
        verification_state = ?,
        verification_method = ?,
        verified_by = ?,
        verified_at = ?,
        updated_at = ?
      WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(newState, verificationMethod, verifierIdentity, now, now, evidenceItemId, ownerId);

    const insertEventStmt = this.db
      .prepare(
        `
      INSERT INTO evidence_verification_events (
        id, evidence_item_id, owner_id, previous_state, new_state,
        verification_method, verifier_identity, rationale, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        eventId,
        evidenceItemId,
        ownerId,
        existing.verificationState,
        newState,
        verificationMethod,
        verifierIdentity,
        rationale || null,
        now,
      );

    await this.db.batch([updateItemStmt, insertEventStmt]);

    const updatedItem = await this.findById(ownerId, evidenceItemId);
    if (!updatedItem)
      throw new Error(`Evidence item lost after verification update: ${evidenceItemId}`);

    const eventEntity: EvidenceVerificationEventEntity = {
      id: eventId as EntityId,
      evidenceItemId: evidenceItemId as EntityId,
      ownerId: ownerId as EntityId,
      previousState: existing.verificationState,
      newState,
      verificationMethod,
      verifierIdentity,
      rationale: rationale || null,
      createdAt: now as ISODateTime,
    };

    return { evidenceItem: updatedItem, event: eventEntity };
  }

  /** Get append-only verification history for an evidence item */
  async getVerificationHistory(
    ownerId: string,
    evidenceItemId: string,
  ): Promise<EvidenceVerificationEventEntity[]> {
    const stmt = this.db
      .prepare(
        `
      SELECT * FROM evidence_verification_events
      WHERE owner_id = ? AND evidence_item_id = ?
      ORDER BY created_at DESC
    `,
      )
      .bind(ownerId, evidenceItemId);

    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => ({
      id: row.id as EntityId,
      evidenceItemId: row.evidence_item_id as EntityId,
      ownerId: row.owner_id as EntityId,
      previousState: (row.previous_state as EvidenceVerificationState) || null,
      newState: row.new_state as EvidenceVerificationState,
      verificationMethod: row.verification_method as string,
      verifierIdentity: row.verifier_identity as string,
      rationale: (row.rationale as string) || null,
      createdAt: row.created_at as ISODateTime,
    }));
  }

  /** Archive evidence item */
  async archive(ownerId: string, id: string): Promise<EvidenceItemEntity> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      UPDATE evidence_items SET archived_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(now, now, id, ownerId);
    await stmt.run();
    const res = await this.findById(ownerId, id);
    if (!res) throw new Error(`Evidence item not found for archive: ${id}`);
    return res;
  }

  /** Restore archived evidence item */
  async restore(ownerId: string, id: string): Promise<EvidenceItemEntity> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      UPDATE evidence_items SET archived_at = NULL, updated_at = ? WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(now, id, ownerId);
    await stmt.run();
    const res = await this.findById(ownerId, id);
    if (!res) throw new Error(`Evidence item not found for restore: ${id}`);
    return res;
  }

  /** Create evidence link (typed edge) with single-target CHECK constraint */
  async createLink(
    ownerId: string,
    evidenceItemId: string,
    input: CreateEvidenceLinkInput,
  ): Promise<EvidenceLinkEntity> {
    const now = new Date().toISOString();

    const targetCols: Record<string, string | null> = {
      capability_id: null,
      claim_id: null,
      project_id: null,
      content_item_id: null,
      artifact_id: null,
      adr_id: null,
      experiment_id: null,
      debugging_lesson_id: null,
      deployment_id: null,
      resume_statement_id: null,
    };

    const targetColMap: Record<string, string> = {
      capability: 'capability_id',
      claim: 'claim_id',
      project: 'project_id',
      content_item: 'content_item_id',
      artifact: 'artifact_id',
      adr: 'adr_id',
      experiment: 'experiment_id',
      debugging_lesson: 'debugging_lesson_id',
      deployment: 'deployment_id',
      resume_statement: 'resume_statement_id',
    };

    const colName = targetColMap[input.targetType];
    if (colName) {
      targetCols[colName] = input.targetId;
    }

    const stmt = this.db
      .prepare(
        `
      INSERT INTO evidence_links (
        id, evidence_item_id, capability_id, claim_id, project_id,
        content_item_id, artifact_id, adr_id, experiment_id, debugging_lesson_id, deployment_id,
        resume_statement_id,
        support_type, relevance, ordering, rationale, provenance, approval_state,
        approved_by, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)
    `,
      )
      .bind(
        input.id,
        evidenceItemId,
        targetCols.capability_id,
        targetCols.claim_id,
        targetCols.project_id,
        targetCols.content_item_id,
        targetCols.artifact_id,
        targetCols.adr_id,
        targetCols.experiment_id,
        targetCols.debugging_lesson_id,
        targetCols.deployment_id,
        targetCols.resume_statement_id,
        input.supportType,
        input.relevance || 3,
        input.ordering || 0,
        input.rationale,
        input.provenance || null,
        ownerId,
        now,
        now,
        now,
      );

    await stmt.run();

    return {
      id: input.id as EntityId,
      evidenceItemId: evidenceItemId as EntityId,
      target: {
        targetType: input.targetType as EvidenceLinkTarget['targetType'],
        targetId: input.targetId as EntityId,
      } as EvidenceLinkTarget,
      supportType: input.supportType,
      relevance: input.relevance || 3,
      ordering: input.ordering || 0,
      provenance: input.provenance || null,
      rationale: input.rationale,
      approvalState: 'approved',
      approvedBy: ownerId,
      approvedAt: now as ISODateTime,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
    };
  }

  /** Delete evidence link */
  async deleteLink(ownerId: string, evidenceItemId: string, linkId: string): Promise<boolean> {
    const stmt = this.db
      .prepare(
        `
      DELETE FROM evidence_links
      WHERE id = ? AND evidence_item_id = ?
        AND EXISTS (
          SELECT 1 FROM evidence_items item
          WHERE item.id = evidence_links.evidence_item_id AND item.owner_id = ?
        )
    `,
      )
      .bind(linkId, evidenceItemId, ownerId);
    const res = await stmt.run();
    return Boolean(res.meta.changes && res.meta.changes > 0);
  }

  /** Get all links attached to an evidence item */
  async getLinksForEvidence(
    ownerId: string,
    evidenceItemId: string,
  ): Promise<EvidenceLinkEntity[]> {
    const stmt = this.db
      .prepare(
        `
      SELECT links.* FROM evidence_links links
      JOIN evidence_items item ON item.id = links.evidence_item_id
      WHERE links.evidence_item_id = ? AND item.owner_id = ?
      ORDER BY links.ordering ASC, links.created_at ASC
    `,
      )
      .bind(evidenceItemId, ownerId);
    const { results } = await stmt.all<Record<string, unknown>>();

    return (results || []).map((row) => {
      let targetType: EvidenceLinkTarget['targetType'] = 'capability';
      let targetId: EntityId = row.capability_id as EntityId;

      if (row.claim_id) {
        targetType = 'claim';
        targetId = row.claim_id as EntityId;
      } else if (row.project_id) {
        targetType = 'project';
        targetId = row.project_id as EntityId;
      } else if (row.content_item_id) {
        targetType = 'content_item';
        targetId = row.content_item_id as EntityId;
      } else if (row.artifact_id) {
        targetType = 'artifact';
        targetId = row.artifact_id as EntityId;
      } else if (row.adr_id) {
        targetType = 'adr';
        targetId = row.adr_id as EntityId;
      } else if (row.experiment_id) {
        targetType = 'experiment';
        targetId = row.experiment_id as EntityId;
      } else if (row.debugging_lesson_id) {
        targetType = 'debugging_lesson';
        targetId = row.debugging_lesson_id as EntityId;
      } else if (row.deployment_id) {
        targetType = 'deployment';
        targetId = row.deployment_id as EntityId;
      } else if (row.resume_statement_id) {
        targetType = 'resume_statement';
        targetId = row.resume_statement_id as EntityId;
      }

      return {
        id: row.id as EntityId,
        evidenceItemId: row.evidence_item_id as EntityId,
        target: { targetType, targetId } as EvidenceLinkTarget,
        supportType: row.support_type as EvidenceSupportType,
        relevance: Number(row.relevance || 3),
        ordering: Number(row.ordering || 0),
        provenance: (row.provenance as string) || null,
        rationale: row.rationale as string,
        approvalState: (row.approval_state as EvidenceLinkApprovalState) || 'approved',
        approvedBy: (row.approved_by as string) || null,
        approvedAt: (row.approved_at as ISODateTime) || null,
        createdAt: row.created_at as ISODateTime,
        updatedAt: row.updated_at as ISODateTime,
      };
    });
  }

  /** Query public eligible evidence items */
  async getPublicEvidence(): Promise<EvidenceItemEntity[]> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      SELECT * FROM evidence_items
      WHERE visibility = 'public'
        AND archived_at IS NULL
        AND verification_state NOT IN ('disputed', 'revoked', 'archived')
        AND (embargo_until IS NULL OR embargo_until <= ?)
      ORDER BY captured_at DESC
    `,
      )
      .bind(now);

    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => this.mapRowToEvidenceEntity(row));
  }

  /** Query public eligible evidence by ID (returns null if private/uneligible) */
  async getPublicEvidenceById(id: string): Promise<EvidenceItemEntity | null> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      SELECT * FROM evidence_items
      WHERE id = ?
        AND visibility = 'public'
        AND archived_at IS NULL
        AND verification_state NOT IN ('disputed', 'revoked', 'archived')
        AND (embargo_until IS NULL OR embargo_until <= ?)
    `,
      )
      .bind(id, now);

    const row = await stmt.first<Record<string, unknown>>();
    return row ? this.mapRowToEvidenceEntity(row) : null;
  }

  private mapRowToEvidenceEntity(row: Record<string, unknown>): EvidenceItemEntity {
    return {
      id: row.id as EntityId,
      ownerId: row.owner_id as EntityId,
      evidenceType: row.evidence_type as EvidenceType,
      sourceType: row.source_type as EvidenceSourceType,
      provider: (row.provider as string) || null,
      externalId: (row.external_id as string) || null,
      canonicalLocator: (row.canonical_locator as string) || null,
      title: row.title as string,
      description: (row.description as string) || null,
      providerCreatedAt: (row.provider_created_at as ISODateTime) || null,
      providerUpdatedAt: (row.provider_updated_at as ISODateTime) || null,
      capturedAt: row.captured_at as ISODateTime,
      occurredAt: (row.occurred_at as ISODateTime) || null,
      contentHash: (row.content_hash as string) || null,
      authorshipNote: (row.authorship_note as string) || null,
      provenanceSnapshot: (row.provenance_snapshot as string) || null,
      licenseMetadata: (row.license_metadata as string) || null,
      confidentialityMetadata: (row.confidentiality_metadata as string) || null,
      verificationState: row.verification_state as EvidenceVerificationState,
      verificationMethod: (row.verification_method as string) || null,
      verifiedBy: (row.verified_by as string) || null,
      verifiedAt: (row.verified_at as ISODateTime) || null,
      qualitySignals: (row.quality_signals as string) || null,
      visibility: row.visibility as Visibility,
      embargoUntil: (row.embargo_until as ISODateTime) || null,
      versionNo: Number(row.version_no || 1),
      createdAt: row.created_at as ISODateTime,
      updatedAt: row.updated_at as ISODateTime,
      archivedAt: (row.archived_at as ISODateTime) || null,
    };
  }
}

export class D1ArtifactRepository {
  constructor(private readonly db: D1Database) {}

  /** List artifacts for private owner dashboard */
  async listForOwner(ownerId: string, includeDeleted: boolean = false): Promise<ArtifactEntity[]> {
    let sql = 'SELECT * FROM artifacts WHERE owner_id = ?';
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }
    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql).bind(ownerId);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []).map((row) => this.mapRowToArtifactEntity(row));
  }

  /** Find artifact by ID and owner */
  async findById(ownerId: string, id: string): Promise<ArtifactEntity | null> {
    const stmt = this.db
      .prepare('SELECT * FROM artifacts WHERE owner_id = ? AND id = ?')
      .bind(ownerId, id);
    const row = await stmt.first<Record<string, unknown>>();
    return row ? this.mapRowToArtifactEntity(row) : null;
  }

  /** Create artifact record in D1 */
  async create(ownerId: string, input: CreateArtifactInput): Promise<ArtifactEntity> {
    const now = new Date().toISOString();
    const visibility = input.visibility || 'private';

    const stmt = this.db
      .prepare(
        `
      INSERT INTO artifacts (
        id, owner_id, title, description, artifact_type, media_type,
        byte_size, checksum, r2_key, original_name, uploaded_by, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        input.id,
        ownerId,
        input.title,
        input.description || null,
        input.artifactType,
        input.mediaType || null,
        input.byteSize || null,
        input.checksum || null,
        input.r2Key,
        input.originalName || null,
        input.uploadedBy || ownerId,
        visibility,
        now,
        now,
      );

    await stmt.run();

    const created = await this.findById(ownerId, input.id);
    if (!created) throw new Error(`Failed to read back created artifact: ${input.id}`);
    return created;
  }

  /** Soft-delete artifact (recoverable lifecycle before permanent deletion) */
  async softDelete(ownerId: string, id: string): Promise<ArtifactEntity> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      UPDATE artifacts SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(now, now, id, ownerId);
    await stmt.run();

    const stmtRead = this.db
      .prepare('SELECT * FROM artifacts WHERE owner_id = ? AND id = ?')
      .bind(ownerId, id);
    const row = await stmtRead.first<Record<string, unknown>>();
    if (!row) throw new Error(`Artifact not found for soft delete: ${id}`);
    return this.mapRowToArtifactEntity(row);
  }

  /** Restore soft-deleted artifact */
  async restore(ownerId: string, id: string): Promise<ArtifactEntity> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      UPDATE artifacts SET deleted_at = NULL, updated_at = ? WHERE id = ? AND owner_id = ?
    `,
      )
      .bind(now, id, ownerId);
    await stmt.run();

    const res = await this.findById(ownerId, id);
    if (!res) throw new Error(`Artifact not found for restore: ${id}`);
    return res;
  }

  /** Query public eligible artifact by ID (returns null if private, uneligible, or parent is uneligible) */
  async getPublicArtifactById(id: string): Promise<ArtifactEntity | null> {
    const stmt = this.db
      .prepare(
        `
      SELECT * FROM artifacts
      WHERE id = ?
        AND visibility = 'public'
        AND deleted_at IS NULL
        AND archived_at IS NULL
    `,
      )
      .bind(id);

    const row = await stmt.first<Record<string, unknown>>();
    if (!row) return null;

    const artifact = this.mapRowToArtifactEntity(row);

    // 1. Check linked evidence eligibility
    const evLinksStmt = this.db
      .prepare(
        `
      SELECT el.*, ei.visibility as ev_visibility, ei.verification_state as ev_verification_state,
             ei.deleted_at as ev_deleted_at, ei.archived_at as ev_archived_at, ei.embargo_until as ev_embargo_until
      FROM evidence_links el
      JOIN evidence_items ei ON el.evidence_item_id = ei.id
      WHERE el.artifact_id = ?
    `,
      )
      .bind(id);

    const { results: evLinks } = await evLinksStmt.all<Record<string, unknown>>();
    if (evLinks && evLinks.length > 0) {
      const now = new Date();
      for (const link of evLinks) {
        if (link.approval_state === 'rejected') continue;
        if (link.ev_visibility !== 'public') return null;
        if (link.ev_deleted_at !== null || link.ev_archived_at !== null) return null;
        if (['disputed', 'revoked', 'archived'].includes(link.ev_verification_state as string))
          return null;
        if (link.ev_embargo_until && new Date(link.ev_embargo_until as string) > now) return null;
      }
    }

    // 2. Check parent content item eligibility (if linked to content item)
    const contentLinksStmt = this.db
      .prepare(
        `
      SELECT ci.visibility, ci.state, ci.deleted_at, ci.scheduled_for, ci.embargo_until
      FROM evidence_links el
      JOIN content_items ci ON el.content_item_id = ci.id
      WHERE el.artifact_id = ?
    `,
      )
      .bind(id);

    const { results: contentLinks } = await contentLinksStmt.all<Record<string, unknown>>();
    if (contentLinks && contentLinks.length > 0) {
      const now = new Date();
      for (const parent of contentLinks) {
        if (parent.visibility !== 'public') return null;
        if (parent.state !== 'published') return null;
        if (parent.deleted_at !== null) return null;
        if (parent.scheduled_for && new Date(parent.scheduled_for as string) > now) return null;
        if (parent.embargo_until && new Date(parent.embargo_until as string) > now) return null;
      }
    }

    return artifact;
  }

  /** Enqueue durable cleanup task when immediate R2 delete fails */
  async enqueueReconciliationItem(ownerId: string, r2Key: string, reason: string): Promise<void> {
    const id = crypto.randomUUID();
    const stmt = this.db
      .prepare(
        `
      INSERT INTO artifact_reconciliation_queue (id, owner_id, r2_key, reason, status)
      VALUES (?, ?, ?, ?, 'pending')
    `,
      )
      .bind(id, ownerId, r2Key, reason);
    await stmt.run().catch(() => null);
  }

  /** Get pending durable reconciliation queue items */
  async getPendingReconciliationQueue(
    ownerId: string,
  ): Promise<Array<{ id: string; r2Key: string; reason: string; createdAt: string }>> {
    const stmt = this.db
      .prepare(
        `
      SELECT id, r2_key as r2Key, reason, created_at as createdAt
      FROM artifact_reconciliation_queue
      WHERE owner_id = ? AND status = 'pending'
      ORDER BY created_at ASC
    `,
      )
      .bind(ownerId);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results || []) as Array<{
      id: string;
      r2Key: string;
      reason: string;
      createdAt: string;
    }>;
  }

  /** Mark durable reconciliation item as resolved */
  async markReconciliationResolved(id: string): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db
      .prepare(
        `
      UPDATE artifact_reconciliation_queue SET status = 'resolved', retried_at = ? WHERE id = ?
    `,
      )
      .bind(now, id);
    await stmt.run().catch(() => null);
  }

  private mapRowToArtifactEntity(row: Record<string, unknown>): ArtifactEntity {
    return {
      id: row.id as EntityId,
      ownerId: row.owner_id as EntityId,
      title: row.title as string,
      description: (row.description as string) || null,
      artifactType: row.artifact_type as string,
      mediaType: (row.media_type as string) || null,
      byteSize: (row.byte_size as number) || null,
      checksum: (row.checksum as string) || null,
      r2Key: row.r2_key as string,
      r2PublicKey: (row.r2_public_key as string) || null,
      originalName: (row.original_name as string) || null,
      uploadedBy: (row.uploaded_by as string) || null,
      visibility: row.visibility as Visibility,
      createdAt: row.created_at as ISODateTime,
      updatedAt: row.updated_at as ISODateTime,
      deletedAt: (row.deleted_at as ISODateTime) || null,
      archivedAt: (row.archived_at as ISODateTime) || null,
    };
  }
}
