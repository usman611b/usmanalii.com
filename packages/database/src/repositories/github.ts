/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * D1 Database Repository for GitHub Evidence Integration — Milestone M6.
 */

import type {
  EvidenceCandidateEntity,
  GitHubOwnerIdentityEntity,
  GitHubRepositoryEntity,
  GitHubSyncCheckpointEntity,
} from '@usmanalii/domain';

export interface CreateCandidateInput {
  readonly provider: 'github';
  readonly externalType: string;
  readonly externalId: string;
  readonly repositoryId: string | null;
  readonly sourceUrl: string;
  readonly sourceCreatedAt: string | null;
  readonly capturedAt: string;
  readonly contentHash: string;
  readonly attributionStatus: string;
  readonly candidateType: string;
  readonly candidateTitle: string;
  readonly candidateDescription: string | null;
  readonly suggestedRelationshipsJson?: string;
  readonly provenanceJson?: string;
  readonly upstreamVisibility?: 'private' | 'public';
  readonly fingerprint: string;
}

export class D1GitHubRepository {
  constructor(private readonly db: D1Database) {}

  /** Gets owner identity mapping */
  async getOwnerIdentity(ownerId: string): Promise<GitHubOwnerIdentityEntity | null> {
    const sql = `SELECT * FROM github_owner_identities WHERE owner_id = ? LIMIT 1`;
    const stmt = this.db.prepare(sql).bind(ownerId);
    const row = await stmt.first<Record<string, unknown>>();
    if (!row) return null;
    return this.mapIdentityRow(row);
  }

  /** Upserts owner identity mapping */
  async upsertOwnerIdentity(
    ownerId: string,
    data: {
      githubUserId: number;
      githubLogin: string;
      commitEmails: readonly string[];
      verificationStatus?: string;
      ownerApproval?: boolean;
    },
  ): Promise<GitHubOwnerIdentityEntity> {
    const existing = await this.getOwnerIdentity(ownerId);
    const id = existing ? existing.id : `gh-ident-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO github_owner_identities (
        id, owner_id, github_user_id, github_login, commit_emails_json,
        verification_status, owner_approval, last_verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, github_user_id) DO UPDATE SET
        github_login = excluded.github_login,
        commit_emails_json = excluded.commit_emails_json,
        verification_status = excluded.verification_status,
        owner_approval = excluded.owner_approval,
        last_verified_at = excluded.last_verified_at,
        updated_at = excluded.updated_at
    `;

    await this.db
      .prepare(sql)
      .bind(
        id,
        ownerId,
        data.githubUserId,
        data.githubLogin,
        JSON.stringify(data.commitEmails),
        data.verificationStatus ?? 'verified',
        data.ownerApproval ? 1 : 0,
        now,
        existing ? existing.createdAt : now,
        now,
      )
      .run();

    return (await this.getOwnerIdentity(ownerId))!;
  }

  /** Lists repositories for owner */
  async listRepositories(
    ownerId: string,
    selectedOnly: boolean = false,
  ): Promise<readonly GitHubRepositoryEntity[]> {
    let sql = `SELECT * FROM github_repositories WHERE owner_id = ?`;
    if (selectedOnly) {
      sql += ` AND selected_for_sync = 1`;
    }
    sql += ` ORDER BY updated_at_github DESC`;

    const stmt = this.db.prepare(sql).bind(ownerId);
    const { results } = await stmt.all<Record<string, unknown>>();
    return (results ?? []).map((row) => this.mapRepoRow(row));
  }

  /** Gets repository by ID */
  async getRepositoryById(ownerId: string, id: string): Promise<GitHubRepositoryEntity | null> {
    const sql = `SELECT * FROM github_repositories WHERE owner_id = ? AND (id = ? OR github_repo_id = ?) LIMIT 1`;
    const stmt = this.db.prepare(sql).bind(ownerId, id, isNaN(Number(id)) ? -1 : Number(id));
    const row = await stmt.first<Record<string, unknown>>();
    if (!row) return null;
    return this.mapRepoRow(row);
  }

  /** Upserts repositories */
  async upsertRepositories(ownerId: string, repos: readonly any[]): Promise<void> {
    const now = new Date().toISOString();
    const stmts = repos.map((repo) => {
      const id = `gh-repo-${repo.githubRepoId}`;
      const sql = `
        INSERT INTO github_repositories (
          id, owner_id, github_repo_id, owner_login, name, full_name, description,
          is_private, is_fork, is_archived, default_branch, primary_language,
          topics_json, homepage_url, html_url, pushed_at, created_at_github,
          updated_at_github, license_spdx_id, parent_repo_full_name, selected_for_sync,
          sync_status, etag, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id, github_repo_id) DO UPDATE SET
          name = excluded.name,
          full_name = excluded.full_name,
          description = excluded.description,
          is_private = excluded.is_private,
          is_fork = excluded.is_fork,
          is_archived = excluded.is_archived,
          default_branch = excluded.default_branch,
          primary_language = excluded.primary_language,
          topics_json = excluded.topics_json,
          homepage_url = excluded.homepage_url,
          html_url = excluded.html_url,
          pushed_at = excluded.pushed_at,
          updated_at_github = excluded.updated_at_github,
          updated_at = excluded.updated_at
      `;
      return this.db
        .prepare(sql)
        .bind(
          id,
          ownerId,
          repo.githubRepoId,
          repo.ownerLogin,
          repo.name,
          repo.fullName,
          repo.description ?? null,
          repo.isPrivate ? 1 : 0,
          repo.isFork ? 1 : 0,
          repo.isArchived ? 1 : 0,
          repo.defaultBranch ?? 'main',
          repo.primaryLanguage ?? null,
          JSON.stringify(repo.topics ?? []),
          repo.homepageUrl ?? null,
          repo.htmlUrl,
          repo.pushedAt ?? null,
          repo.createdAtGithub ?? null,
          repo.updatedAtGithub ?? null,
          repo.licenseSpdxId ?? null,
          repo.parentRepoFullName ?? null,
          repo.selectedForSync !== undefined ? (repo.selectedForSync ? 1 : 0) : 1,
          'idle',
          repo.etag ?? null,
          now,
          now,
        );
    });

    if (stmts.length > 0) {
      await this.db.batch(stmts);
    }
  }

  /** Toggles repository selection for sync */
  async toggleRepositorySync(
    ownerId: string,
    id: string,
    selectedForSync: boolean,
  ): Promise<boolean> {
    const sql = `UPDATE github_repositories SET selected_for_sync = ?, updated_at = ? WHERE owner_id = ? AND id = ?`;
    const res = await this.db
      .prepare(sql)
      .bind(selectedForSync ? 1 : 0, new Date().toISOString(), ownerId, id)
      .run();
    return (res.meta.rows_written ?? 0) > 0;
  }

  /** Atomically claims a repository sync, allowing takeover only after the claim is stale. */
  async tryClaimRepositorySync(
    ownerId: string,
    repositoryId: string,
    claimedAt: string,
    staleBefore: string,
  ): Promise<boolean> {
    const sql = `
      UPDATE github_repositories
      SET sync_status = 'syncing', last_synced_at = ?, updated_at = ?
      WHERE owner_id = ? AND id = ?
        AND (sync_status != 'syncing' OR last_synced_at IS NULL OR last_synced_at <= ?)
    `;
    const result = await this.db
      .prepare(sql)
      .bind(claimedAt, claimedAt, ownerId, repositoryId, staleBefore)
      .run();
    return (result.meta.rows_written ?? 0) > 0;
  }

  /** Releases a repository sync claim with its terminal status. */
  async completeRepositorySync(
    ownerId: string,
    repositoryId: string,
    status: 'synced' | 'error' | 'access_revoked',
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE github_repositories
         SET sync_status = ?, last_synced_at = ?, updated_at = ?
         WHERE owner_id = ? AND id = ?`,
      )
      .bind(status, now, now, ownerId, repositoryId)
      .run();
  }

  /** Links repository to project */
  async linkRepositoryToProject(
    ownerId: string,
    repositoryId: string,
    projectId: string | null,
  ): Promise<boolean> {
    const sql = `UPDATE github_repositories SET linked_project_id = ?, updated_at = ? WHERE owner_id = ? AND id = ?`;
    const res = await this.db
      .prepare(sql)
      .bind(projectId, new Date().toISOString(), ownerId, repositoryId)
      .run();
    return (res.meta.rows_written ?? 0) > 0;
  }

  /** Gets sync checkpoint */
  async getCheckpoint(
    ownerId: string,
    repositoryId: string,
    resourceType: string,
  ): Promise<GitHubSyncCheckpointEntity | null> {
    const sql = `SELECT * FROM github_sync_checkpoints WHERE owner_id = ? AND repository_id = ? AND resource_type = ? LIMIT 1`;
    const row = await this.db
      .prepare(sql)
      .bind(ownerId, repositoryId, resourceType)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      id: String(row.id) as any,
      ownerId: String(row.owner_id) as any,
      repositoryId: String(row.repository_id) as any,
      resourceType: String(row.resource_type) as any,
      cursor: row.cursor ? String(row.cursor) : null,
      etag: row.etag ? String(row.etag) : null,
      lastModified: row.last_modified ? String(row.last_modified) : null,
      updatedAt: String(row.updated_at) as any,
    };
  }

  /** Upserts sync checkpoint */
  async upsertCheckpoint(
    ownerId: string,
    repositoryId: string,
    resourceType: string,
    checkpoint: { cursor?: string | null; etag?: string | null; lastModified?: string | null },
  ): Promise<void> {
    const id = `chk-${repositoryId}-${resourceType}`;
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO github_sync_checkpoints (id, owner_id, repository_id, resource_type, cursor, etag, last_modified, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, repository_id, resource_type) DO UPDATE SET
        cursor = excluded.cursor,
        etag = excluded.etag,
        last_modified = excluded.last_modified,
        updated_at = excluded.updated_at
    `;
    await this.db
      .prepare(sql)
      .bind(
        id,
        ownerId,
        repositoryId,
        resourceType,
        checkpoint.cursor ?? null,
        checkpoint.etag ?? null,
        checkpoint.lastModified ?? null,
        now,
      )
      .run();
  }

  /** Upserts imported objects */
  async upsertImportedObjects(
    ownerId: string,
    repositoryId: string,
    objects: readonly any[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const stmts = objects.map((obj) => {
      const id = `gh-obj-${repositoryId}-${obj.externalType}-${obj.externalId}`;
      const sql = `
        INSERT INTO github_imported_objects (
          id, owner_id, repository_id, external_type, external_id, content_hash,
          raw_payload_sanitized, upstream_state, source_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id, repository_id, external_type, external_id) DO UPDATE SET
          content_hash = excluded.content_hash,
          raw_payload_sanitized = excluded.raw_payload_sanitized,
          upstream_state = excluded.upstream_state,
          source_url = excluded.source_url,
          updated_at = excluded.updated_at
      `;
      return this.db
        .prepare(sql)
        .bind(
          id,
          ownerId,
          repositoryId,
          obj.externalType,
          String(obj.externalId),
          obj.contentHash,
          typeof obj.rawPayloadSanitized === 'string'
            ? obj.rawPayloadSanitized
            : JSON.stringify(obj.rawPayloadSanitized),
          obj.upstreamState ?? 'imported',
          obj.sourceUrl,
          now,
          now,
        );
    });

    if (stmts.length > 0) {
      await this.db.batch(stmts);
    }
  }

  /** Lists evidence candidates */
  async listCandidates(
    ownerId: string,
    reviewState?: string,
  ): Promise<readonly EvidenceCandidateEntity[]> {
    let sql = `SELECT * FROM evidence_candidates WHERE owner_id = ?`;
    const params: any[] = [ownerId];
    if (reviewState) {
      sql += ` AND review_state = ?`;
      params.push(reviewState);
    }
    sql += ` ORDER BY created_at DESC`;

    const { results } = await this.db
      .prepare(sql)
      .bind(...params)
      .all<Record<string, unknown>>();
    return (results ?? []).map((row) => this.mapCandidateRow(row));
  }

  /** Gets candidate by ID */
  async getCandidateById(ownerId: string, id: string): Promise<EvidenceCandidateEntity | null> {
    const sql = `SELECT * FROM evidence_candidates WHERE owner_id = ? AND id = ? LIMIT 1`;
    const row = await this.db.prepare(sql).bind(ownerId, id).first<Record<string, unknown>>();
    if (!row) return null;
    return this.mapCandidateRow(row);
  }

  /** Creates candidates idempotently using fingerprint */
  async createCandidates(
    ownerId: string,
    candidates: readonly CreateCandidateInput[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const stmts = candidates.map((c) => {
      const id = `cand-${crypto.randomUUID()}`;
      const sql = `
        INSERT INTO evidence_candidates (
          id, owner_id, provider, external_type, external_id, repository_id,
          source_url, source_created_at, captured_at, content_hash, attribution_status,
          candidate_type, candidate_title, candidate_description, suggested_relationships_json,
          provenance_json, upstream_visibility, review_state, fingerprint, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)
        ON CONFLICT(owner_id, fingerprint) DO UPDATE SET
          candidate_title = CASE WHEN review_state = 'pending_review' THEN excluded.candidate_title ELSE candidate_title END,
          candidate_description = CASE WHEN review_state = 'pending_review' THEN excluded.candidate_description ELSE candidate_description END,
          attribution_status = excluded.attribution_status,
          upstream_visibility = excluded.upstream_visibility,
          updated_at = excluded.updated_at
      `;
      return this.db
        .prepare(sql)
        .bind(
          id,
          ownerId,
          c.provider,
          c.externalType,
          c.externalId,
          c.repositoryId,
          c.sourceUrl,
          c.sourceCreatedAt,
          c.capturedAt,
          c.contentHash,
          c.attributionStatus,
          c.candidateType,
          c.candidateTitle,
          c.candidateDescription,
          c.suggestedRelationshipsJson ?? '[]',
          c.provenanceJson ?? '{}',
          c.upstreamVisibility ?? 'private',
          c.fingerprint,
          now,
          now,
        );
    });

    if (stmts.length > 0) {
      await this.db.batch(stmts);
    }
  }

  /** Accepts evidence candidate atomically into Evidence Ledger */
  async acceptCandidate(
    ownerId: string,
    candidateId: string,
    options: { title?: string; description?: string; linkProjectId?: string },
  ): Promise<{ evidenceItemId: string }> {
    const candidate = await this.getCandidateById(ownerId, candidateId);
    if (!candidate) {
      throw new Error(`CANDIDATE_NOT_FOUND: Candidate ${candidateId} not found`);
    }

    if (
      (candidate.reviewState === 'accepted' || candidate.reviewState === 'edited_and_accepted') &&
      candidate.acceptedEvidenceItemId
    ) {
      return { evidenceItemId: candidate.acceptedEvidenceItemId }; // Idempotent return
    }

    const evidenceItemId = `ev-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const finalTitle = options.title || candidate.candidateTitle;
    const finalDesc = options.description || candidate.candidateDescription;
    const isEdited = options.title || options.description;

    const insertEvidenceSql = `
      INSERT INTO evidence_items (
        id, owner_id, evidence_type, source_type, provider, external_id,
        canonical_locator, title, description, captured_at, verification_state,
        visibility, created_at, updated_at
      ) VALUES (?, ?, ?, 'github', 'github', ?, ?, ?, ?, ?, 'source_verified', 'private', ?, ?)
    `;

    const updateCandidateSql = `
      UPDATE evidence_candidates
      SET review_state = ?, accepted_evidence_item_id = ?, updated_at = ?
      WHERE owner_id = ? AND id = ?
    `;

    const batchStmts = [
      this.db
        .prepare(insertEvidenceSql)
        .bind(
          evidenceItemId,
          ownerId,
          candidate.candidateType,
          candidate.externalId,
          candidate.sourceUrl,
          finalTitle,
          finalDesc,
          now,
          now,
          now,
        ),
      this.db
        .prepare(updateCandidateSql)
        .bind(
          isEdited ? 'edited_and_accepted' : 'accepted',
          evidenceItemId,
          now,
          ownerId,
          candidateId,
        ),
    ];

    if (options.linkProjectId) {
      const linkId = `link-${crypto.randomUUID()}`;
      const insertLinkSql = `
        INSERT INTO evidence_links (
          id, evidence_item_id, target_type, target_id, support_type,
          relevance, ordering, rationale, approval_state, approved_by, approved_at,
          created_at, updated_at
        ) VALUES (?, ?, 'project', ?, 'demonstrates', 5, 0, 'Approved from GitHub candidate', 'approved', ?, ?, ?, ?)
      `;
      batchStmts.push(
        this.db
          .prepare(insertLinkSql)
          .bind(linkId, evidenceItemId, options.linkProjectId, ownerId, now, now, now),
      );
    }

    await this.db.batch(batchStmts);
    return { evidenceItemId };
  }

  /** Rejects candidate */
  async rejectCandidate(ownerId: string, candidateId: string, reason: string): Promise<boolean> {
    const sql = `UPDATE evidence_candidates SET review_state = 'rejected', rejection_reason = ?, updated_at = ? WHERE owner_id = ? AND id = ?`;
    const res = await this.db
      .prepare(sql)
      .bind(reason, new Date().toISOString(), ownerId, candidateId)
      .run();
    return (res.meta.rows_written ?? 0) > 0;
  }

  /** Records rate limit snapshot */
  async recordRateLimitSnapshot(
    ownerId: string,
    snapshot: {
      limitTotal: number;
      remaining: number;
      resetAt: string;
      used: number;
      resourceCategory?: string;
    },
  ): Promise<void> {
    const id = `rate-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO github_rate_limit_snapshots (id, owner_id, limit_total, remaining, reset_at, used, resource_category, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db
      .prepare(sql)
      .bind(
        id,
        ownerId,
        snapshot.limitTotal,
        snapshot.remaining,
        snapshot.resetAt,
        snapshot.used,
        snapshot.resourceCategory ?? 'core',
        now,
      )
      .run();
  }

  private mapIdentityRow(row: Record<string, unknown>): GitHubOwnerIdentityEntity {
    return {
      id: String(row.id) as any,
      ownerId: String(row.owner_id) as any,
      githubUserId: Number(row.github_user_id),
      githubLogin: String(row.github_login),
      commitEmails: JSON.parse(String(row.commit_emails_json || '[]')),
      verificationStatus: String(row.verification_status) as any,
      ownerApproval: Boolean(row.owner_approval),
      lastVerifiedAt: row.last_verified_at ? (String(row.last_verified_at) as any) : null,
      createdAt: String(row.created_at) as any,
      updatedAt: String(row.updated_at) as any,
    };
  }

  private mapRepoRow(row: Record<string, unknown>): GitHubRepositoryEntity {
    return {
      id: String(row.id) as any,
      ownerId: String(row.owner_id) as any,
      githubRepoId: Number(row.github_repo_id),
      ownerLogin: String(row.owner_login),
      name: String(row.name),
      fullName: String(row.full_name),
      description: row.description ? String(row.description) : null,
      isPrivate: Boolean(row.is_private),
      isFork: Boolean(row.is_fork),
      isArchived: Boolean(row.is_archived),
      defaultBranch: String(row.default_branch || 'main'),
      primaryLanguage: row.primary_language ? String(row.primary_language) : null,
      topics: JSON.parse(String(row.topics_json || '[]')),
      homepageUrl: row.homepage_url ? String(row.homepage_url) : null,
      htmlUrl: String(row.html_url),
      pushedAt: row.pushed_at ? (String(row.pushed_at) as any) : null,
      createdAtGithub: row.created_at_github ? (String(row.created_at_github) as any) : null,
      updatedAtGithub: row.updated_at_github ? (String(row.updated_at_github) as any) : null,
      licenseSpdxId: row.license_spdx_id ? String(row.license_spdx_id) : null,
      parentRepoFullName: row.parent_repo_full_name ? String(row.parent_repo_full_name) : null,
      selectedForSync: Boolean(row.selected_for_sync),
      linkedProjectId: row.linked_project_id ? (String(row.linked_project_id) as any) : null,
      lastSyncedAt: row.last_synced_at ? (String(row.last_synced_at) as any) : null,
      syncStatus: String(row.sync_status || 'idle') as any,
      etag: row.etag ? String(row.etag) : null,
      createdAt: String(row.created_at) as any,
      updatedAt: String(row.updated_at) as any,
    };
  }

  private mapCandidateRow(row: Record<string, unknown>): EvidenceCandidateEntity {
    return {
      id: String(row.id) as any,
      ownerId: String(row.owner_id) as any,
      provider: 'github',
      externalType: String(row.external_type) as any,
      externalId: String(row.external_id),
      repositoryId: row.repository_id ? (String(row.repository_id) as any) : null,
      sourceUrl: String(row.source_url),
      sourceCreatedAt: row.source_created_at ? (String(row.source_created_at) as any) : null,
      capturedAt: String(row.captured_at) as any,
      contentHash: String(row.content_hash),
      attributionStatus: String(row.attribution_status) as any,
      candidateType: String(row.candidate_type),
      candidateTitle: String(row.candidate_title),
      candidateDescription: row.candidate_description ? String(row.candidate_description) : null,
      suggestedRelationshipsJson: String(row.suggested_relationships_json || '[]'),
      provenanceJson: String(row.provenance_json || '{}'),
      upstreamVisibility: String(row.upstream_visibility || 'private') as any,
      reviewState: String(row.review_state || 'pending_review') as any,
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
      fingerprint: String(row.fingerprint),
      acceptedEvidenceItemId: row.accepted_evidence_item_id
        ? (String(row.accepted_evidence_item_id) as any)
        : null,
      createdAt: String(row.created_at) as any,
      updatedAt: String(row.updated_at) as any,
    };
  }
}
