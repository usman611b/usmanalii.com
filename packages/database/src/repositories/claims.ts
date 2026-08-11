/**
 * D1 Claims Repository — Milestone M7 Claims & Claims Support Management
 *
 * SECURITY: All owner operations require AuthorizationContext.
 * Claims publication requires approval, valid support edges or audited exception, and evidence health.
 */

import type { AuthorizationContext } from '@usmanalii/authorization';
import { requireOwnerContext } from '@usmanalii/authorization';
import type {
  ClaimEntity,
  ClaimSupportEntity,
  EvidenceItemEntity,
  EntityId,
  ISODate,
  ISODateTime,
  Visibility,
  PublicationState,
  ClaimApprovalState,
  ClaimAudience,
  ClaimSupportTargetType,
  EvidenceType,
  EvidenceSourceType,
  EvidenceVerificationState,
} from '@usmanalii/domain';
import { explainClaimEligibility, type ClaimEligibilityResult } from '@usmanalii/domain';
import type {
  PublicClaimDto,
  CreateClaimRequest,
  UpdateClaimRequest,
  ClaimSupportRequest,
} from '@usmanalii/contracts';

interface RawClaimRow {
  id: string;
  owner_id: string;
  wording: string;
  approved_wording: string | null;
  audience: string;
  context: string | null;
  approval_state: string;
  approved_at: string | null;
  review_date: string | null;
  is_background_statement_exception: number;
  background_statement_exception_reason: string | null;
  visibility: string;
  state: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_no: number;
}

interface RawSupportRow {
  id: string;
  claim_id: string;
  owner_id: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

interface RawEvidenceRow {
  id: string;
  owner_id: string;
  evidence_type: string;
  source_type: string;
  provider: string | null;
  external_id: string | null;
  canonical_locator: string | null;
  title: string;
  description: string | null;
  provider_created_at: string | null;
  provider_updated_at: string | null;
  captured_at: string;
  occurred_at: string | null;
  content_hash: string | null;
  authorship_note: string | null;
  provenance_snapshot: string | null;
  license_metadata: string | null;
  confidentiality_metadata: string | null;
  verification_state: string;
  verification_method: string | null;
  verified_by: string | null;
  verified_at: string | null;
  quality_signals: string | null;
  visibility: string;
  embargo_until: string | null;
  version_no: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

function mapClaimRow(row: RawClaimRow): ClaimEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    wording: row.wording,
    approvedWording: row.approved_wording ?? null,
    audience: row.audience as ClaimAudience,
    context: row.context ?? null,
    approvalState: row.approval_state as ClaimApprovalState,
    approvedAt: row.approved_at ? (row.approved_at as ISODateTime) : null,
    reviewDate: row.review_date ? (row.review_date as ISODate) : null,
    isBackgroundStatementException: Boolean(row.is_background_statement_exception),
    backgroundStatementExceptionReason: row.background_statement_exception_reason ?? null,
    visibility: row.visibility as Visibility,
    state: row.state as PublicationState,
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

function mapSupportRow(row: RawSupportRow): ClaimSupportEntity {
  return {
    id: row.id as EntityId,
    claimId: row.claim_id as EntityId,
    ownerId: row.owner_id as EntityId,
    targetType: row.target_type as ClaimSupportTargetType,
    targetId: row.target_id as EntityId,
    createdAt: row.created_at as ISODateTime,
  };
}

function mapEvidenceRow(row: RawEvidenceRow): EvidenceItemEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    evidenceType: row.evidence_type as EvidenceType,
    sourceType: row.source_type as EvidenceSourceType,
    provider: row.provider ?? null,
    externalId: row.external_id ?? null,
    canonicalLocator: row.canonical_locator ?? null,
    title: row.title,
    description: row.description ?? null,
    providerCreatedAt: row.provider_created_at ? (row.provider_created_at as ISODateTime) : null,
    providerUpdatedAt: row.provider_updated_at ? (row.provider_updated_at as ISODateTime) : null,
    capturedAt: row.captured_at as ISODateTime,
    occurredAt: row.occurred_at ? (row.occurred_at as ISODateTime) : null,
    contentHash: row.content_hash ?? null,
    authorshipNote: row.authorship_note ?? null,
    provenanceSnapshot: row.provenance_snapshot ?? null,
    licenseMetadata: row.license_metadata ?? null,
    confidentialityMetadata: row.confidentiality_metadata ?? null,
    verificationState: row.verification_state as EvidenceVerificationState,
    verificationMethod: row.verification_method ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ? (row.verified_at as ISODateTime) : null,
    qualitySignals: row.quality_signals ?? null,
    visibility: row.visibility as Visibility,
    embargoUntil: row.embargo_until ? (row.embargo_until as ISODateTime) : null,
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

export class D1ClaimsRepository {
  constructor(private readonly db: D1Database) {}

  async listOwnerClaims(ctx: AuthorizationContext): Promise<readonly ClaimEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM claims WHERE owner_id = ? AND archived_at IS NULL ORDER BY created_at DESC',
      )
      .bind(ctx.ownerId)
      .all<RawClaimRow>();

    return (results ?? []).map(mapClaimRow);
  }

  async listPublicClaims(): Promise<readonly PublicClaimDto[]> {
    const { results: rawClaims } = await this.db
      .prepare(
        `SELECT * FROM claims
         WHERE visibility = 'public' AND state = 'published' AND approval_state = 'approved' AND archived_at IS NULL`,
      )
      .all<RawClaimRow>();

    const publicClaims: PublicClaimDto[] = [];

    for (const rawClaim of rawClaims ?? []) {
      const claim = mapClaimRow(rawClaim);
      const supports = await this.getClaimSupportsInternal(claim.id);
      const supportingEvidence = await this.getSupportingEvidenceInternal(claim.id);

      const eligibility = explainClaimEligibility(claim, supports, supportingEvidence);

      if (eligibility.eligible) {
        publicClaims.push({
          id: claim.id,
          wording: claim.approvedWording || claim.wording,
          audience: claim.audience,
          context: claim.context,
          isBackgroundStatementException: claim.isBackgroundStatementException,
          healthySupportCount: eligibility.healthySupportCount,
          supports: supports.map((s) => ({ targetType: s.targetType, targetId: s.targetId })),
        });
      }
    }

    return publicClaims;
  }

  async getClaimById(ctx: AuthorizationContext, id: string): Promise<ClaimEntity | null> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const row = await this.db
      .prepare('SELECT * FROM claims WHERE id = ? AND owner_id = ?')
      .bind(id, ctx.ownerId)
      .first<RawClaimRow>();

    if (!row) return null;
    return mapClaimRow(row);
  }

  async createClaim(ctx: AuthorizationContext, input: CreateClaimRequest): Promise<ClaimEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO claims (
          id, owner_id, wording, approved_wording, audience, context,
          approval_state, approved_at, review_date, is_background_statement_exception,
          background_statement_exception_reason, visibility, state, version_no, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, 'draft', NULL, NULL, ?, ?, ?, 'draft', 1, ?, ?)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.wording,
        input.audience,
        input.context ?? null,
        input.isBackgroundStatementException ? 1 : 0,
        input.backgroundStatementExceptionReason ?? null,
        input.visibility || 'private',
        now,
        now,
      )
      .run();

    const created = await this.getClaimById(ctx, id);
    if (!created) throw new Error('CLAIM_CREATE_FAILED');
    return created;
  }

  async updateClaim(
    ctx: AuthorizationContext,
    id: string,
    updates: UpdateClaimRequest,
  ): Promise<ClaimEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const existing = await this.getClaimById(ctx, id);
    if (!existing) throw new Error('CLAIM_NOT_FOUND');
    if (existing.versionNo !== updates.versionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Claim modified by another request');
    }

    const now = new Date().toISOString();
    const newVersionNo = updates.versionNo + 1;

    let updatedApprovedWording = existing.approvedWording;
    let updatedApprovedAt = existing.approvedAt;

    if (updates.approvalState === 'approved' && existing.approvalState !== 'approved') {
      updatedApprovedWording = updates.wording ?? existing.wording;
      updatedApprovedAt = now as ISODateTime;
    } else if (updates.approvalState && updates.approvalState !== 'approved') {
      updatedApprovedWording = null;
      updatedApprovedAt = null;
    }

    const res = await this.db
      .prepare(
        `UPDATE claims SET
          wording = ?, approved_wording = ?, audience = ?, context = ?,
          approval_state = ?, approved_at = ?, review_date = ?,
          is_background_statement_exception = ?, background_statement_exception_reason = ?,
          visibility = ?, state = ?, updated_at = ?, version_no = ?
        WHERE id = ? AND owner_id = ? AND version_no = ?`,
      )
      .bind(
        updates.wording ?? existing.wording,
        updatedApprovedWording,
        updates.audience ?? existing.audience,
        updates.context !== undefined ? updates.context : existing.context,
        updates.approvalState ?? existing.approvalState,
        updatedApprovedAt,
        updates.reviewDate !== undefined ? updates.reviewDate : existing.reviewDate,
        updates.isBackgroundStatementException !== undefined
          ? updates.isBackgroundStatementException
            ? 1
            : 0
          : existing.isBackgroundStatementException
            ? 1
            : 0,
        updates.backgroundStatementExceptionReason !== undefined
          ? updates.backgroundStatementExceptionReason
          : existing.backgroundStatementExceptionReason,
        updates.visibility ?? existing.visibility,
        updates.state ?? existing.state,
        now,
        newVersionNo,
        id,
        ctx.ownerId,
        updates.versionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Claim update failed');
    }

    const updated = await this.getClaimById(ctx, id);
    if (!updated) throw new Error('CLAIM_FETCH_FAILED');
    return updated;
  }

  async deleteClaim(ctx: AuthorizationContext, id: string): Promise<boolean> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const now = new Date().toISOString();
    const res = await this.db
      .prepare('UPDATE claims SET archived_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .bind(now, now, id, ctx.ownerId)
      .run();

    return res.success && res.meta.changes > 0;
  }

  async addClaimSupport(
    ctx: AuthorizationContext,
    claimId: string,
    input: ClaimSupportRequest,
  ): Promise<ClaimSupportEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const claim = await this.getClaimById(ctx, claimId);
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO claim_supports (id, claim_id, owner_id, target_type, target_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (claim_id, target_type, target_id) DO NOTHING`,
      )
      .bind(id, claimId, ctx.ownerId, input.targetType, input.targetId, now)
      .run();

    const row = await this.db
      .prepare(
        'SELECT * FROM claim_supports WHERE claim_id = ? AND target_type = ? AND target_id = ?',
      )
      .bind(claimId, input.targetType, input.targetId)
      .first<RawSupportRow>();

    if (!row) throw new Error('CLAIM_SUPPORT_CREATE_FAILED');
    return mapSupportRow(row);
  }

  async removeClaimSupport(
    ctx: AuthorizationContext,
    claimId: string,
    targetType: string,
    targetId: string,
  ): Promise<boolean> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const res = await this.db
      .prepare(
        'DELETE FROM claim_supports WHERE claim_id = ? AND target_type = ? AND target_id = ? AND owner_id = ?',
      )
      .bind(claimId, targetType, targetId, ctx.ownerId)
      .run();

    return res.success && res.meta.changes > 0;
  }

  async getClaimSupports(
    ctx: AuthorizationContext,
    claimId: string,
  ): Promise<readonly ClaimSupportEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    return this.getClaimSupportsInternal(claimId);
  }

  async checkClaimEligibility(
    ctx: AuthorizationContext,
    claimId: string,
  ): Promise<ClaimEligibilityResult> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const claim = await this.getClaimById(ctx, claimId);
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const supports = await this.getClaimSupportsInternal(claimId);
    const supportingEvidence = await this.getSupportingEvidenceInternal(claimId);

    return explainClaimEligibility(claim, supports, supportingEvidence);
  }

  private async getClaimSupportsInternal(claimId: string): Promise<readonly ClaimSupportEntity[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM claim_supports WHERE claim_id = ?')
      .bind(claimId)
      .all<RawSupportRow>();

    return (results ?? []).map(mapSupportRow);
  }

  private async getSupportingEvidenceInternal(
    claimId: string,
  ): Promise<readonly EvidenceItemEntity[]> {
    const { results } = await this.db
      .prepare(
        `SELECT e.* FROM evidence_items e
         JOIN claim_supports cs ON cs.target_id = e.id AND cs.target_type = 'evidence'
         WHERE cs.claim_id = ?
         UNION
         SELECT e.* FROM evidence_items e
         JOIN evidence_links el ON el.evidence_item_id = e.id
         WHERE el.claim_id = ?`,
      )
      .bind(claimId, claimId)
      .all<RawEvidenceRow>();

    return (results ?? []).map(mapEvidenceRow);
  }
}
