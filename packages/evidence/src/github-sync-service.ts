/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GitHub Synchronization Service — Milestone M6.
 *
 * Directives:
 *  - Orchestrates incremental, idempotent GitHub REST data synchronization
 *  - Generates evidence candidates and records checkpoints
 *  - Prevents secret leaks, respects rate limits, handles partial failures
 *  - Link-header pagination with loop protection & max pages cap
 *  - Concurrent sync exclusion & stale claim recovery
 */

import { generateCandidateFingerprint, matchCommitAttribution } from '@usmanalii/domain';
import type { GitHubClient, GitHubResponse } from './github-client.js';

export interface GitHubSyncRepository {
  upsertRepositories(ownerId: string, repositories: readonly any[]): Promise<void>;
  recordRateLimitSnapshot(ownerId: string, snapshot: any): Promise<void>;
  getOwnerIdentity(ownerId: string): Promise<any>;
  listRepositories(ownerId: string, selectedOnly?: boolean): Promise<readonly any[]>;
  tryClaimRepositorySync(
    ownerId: string,
    repositoryId: string,
    claimedAt: string,
    staleBefore: string,
  ): Promise<boolean>;
  completeRepositorySync(
    ownerId: string,
    repositoryId: string,
    status: 'synced' | 'error' | 'access_revoked',
  ): Promise<void>;
  getCheckpoint(ownerId: string, repositoryId: string, resourceType: string): Promise<any>;
  upsertImportedObjects(
    ownerId: string,
    repositoryId: string,
    objects: readonly any[],
  ): Promise<void>;
  createCandidates(ownerId: string, candidates: readonly any[]): Promise<void>;
  upsertCheckpoint(
    ownerId: string,
    repositoryId: string,
    resourceType: string,
    checkpoint: any,
  ): Promise<void>;
}

export interface SyncRunResult {
  readonly success: boolean;
  readonly repositoriesProcessed: number;
  readonly itemsImported: number;
  readonly candidatesCreated: number;
  readonly rateLimitRemaining: number;
  readonly errorSummary: string | null;
}

export class GitHubSyncService {
  constructor(private readonly repo: GitHubSyncRepository) {}

  /**
   * Discovers repositories for owner identity.
   */
  async discoverRepositories(
    ownerId: string,
    client: GitHubClient,
  ): Promise<{ count: number; rateLimitRemaining: number }> {
    const visitedUrls = new Set<string>();
    let nextUrl: string | null = '/user/repos?per_page=100&sort=updated';
    let pagesCount = 0;
    const maxPages = 5;
    const allRepos: any[] = [];
    let lastRemaining = 5000;

    while (nextUrl && pagesCount < maxPages) {
      visitedUrls.add(nextUrl);
      pagesCount += 1;

      const res: GitHubResponse<any[]> = await client.get<any[]>(nextUrl, { visitedUrls });
      lastRemaining = res.rateLimit.remaining;

      if (res.data) {
        allRepos.push(...res.data);
      }

      nextUrl = res.nextUrl;
    }

    const repoList = allRepos.map((r: Record<string, any>) => ({
      githubRepoId: r.id,
      ownerLogin: r.owner?.login || '',
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      isPrivate: Boolean(r.private),
      isFork: Boolean(r.fork),
      isArchived: Boolean(r.archived),
      defaultBranch: r.default_branch || 'main',
      primaryLanguage: r.language,
      topics: r.topics || [],
      homepageUrl: r.homepage,
      htmlUrl: r.html_url,
      pushedAt: r.pushed_at,
      createdAtGithub: r.created_at,
      updatedAtGithub: r.updated_at,
      licenseSpdxId: r.license?.spdx_id,
      parentRepoFullName: r.parent?.full_name,
    }));

    await this.repo.upsertRepositories(ownerId, repoList);

    // Record rate limit snapshot
    await this.repo.recordRateLimitSnapshot(ownerId, {
      limitTotal: 5000,
      remaining: lastRemaining,
      resetAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      used: 5000 - lastRemaining,
    });

    return { count: repoList.length, rateLimitRemaining: lastRemaining };
  }

  /**
   * Synchronizes selected repositories for owner.
   */
  async syncSelectedRepositories(
    ownerId: string,
    client: GitHubClient,
    options: { repoId?: string } = {},
  ): Promise<SyncRunResult> {
    const ownerIdentity = await this.repo.getOwnerIdentity(ownerId);
    let selectedRepos = await this.repo.listRepositories(ownerId, true);

    if (options.repoId) {
      selectedRepos = selectedRepos.filter(
        (r: { id: string; githubRepoId: number }) =>
          r.id === options.repoId || String(r.githubRepoId) === options.repoId,
      );
    }

    let repositoriesProcessed = 0;
    let itemsImported = 0;
    let candidatesCreated = 0;
    let lastRemaining = 5000;
    const errors: string[] = [];

    for (const repo of selectedRepos) {
      // Stop before claiming more work if the primary rate limit is dangerously low.
      if (lastRemaining < 50) {
        errors.push(`Rate limit low (${lastRemaining} remaining); stopping sync run early.`);
        break;
      }

      const nowMs = Date.now();
      const claimedAt = new Date(nowMs).toISOString();
      const staleBefore = new Date(nowMs - 300000).toISOString();
      const claimed = await this.repo.tryClaimRepositorySync(
        ownerId,
        repo.id,
        claimedAt,
        staleBefore,
      );
      if (!claimed) continue;

      try {
        repositoriesProcessed += 1;
        const [ownerName, repoName] = repo.fullName.split('/');

        // 1. Sync Commits (Bounded to 30 recent commits)
        const checkpoint = await this.repo.getCheckpoint(ownerId, repo.id, 'commit');
        const commitRes = await client.get<any[]>(
          `/repos/${ownerName}/${repoName}/commits?per_page=30`,
          { etag: checkpoint?.etag ?? null },
        );

        lastRemaining = commitRes.rateLimit.remaining;

        if (!commitRes.notModified && commitRes.data) {
          const importedObjects: any[] = [];
          const candidates: any[] = [];

          for (const c of commitRes.data) {
            const commitSha = c.sha;
            const sourceUrl =
              c.html_url || `https://github.com/${repo.fullName}/commit/${commitSha}`;
            const commitMsg = c.commit?.message || 'Commit update';
            const commitDate =
              c.commit?.author?.date || c.commit?.committer?.date || new Date().toISOString();

            const attribution = matchCommitAttribution(
              {
                authorId: c.author?.id,
                authorLogin: c.author?.login,
                authorEmail: c.commit?.author?.email,
                authorType: c.author?.type,
                committerId: c.committer?.id,
                committerLogin: c.committer?.login,
                committerEmail: c.commit?.committer?.email,
                committerType: c.committer?.type,
                message: commitMsg,
              },
              ownerIdentity,
            );

            // Skip bot activity
            if (attribution === 'bot_ignored') continue;

            const contentHash = commitSha.slice(0, 12);
            importedObjects.push({
              externalType: 'commit',
              externalId: commitSha,
              contentHash,
              rawPayloadSanitized: JSON.stringify({
                sha: commitSha,
                message: commitMsg,
                author: c.author?.login,
                date: commitDate,
              }),
              sourceUrl,
            });

            candidates.push({
              provider: 'github',
              externalType: 'commit',
              externalId: commitSha,
              repositoryId: repo.id,
              sourceUrl,
              sourceCreatedAt: commitDate,
              capturedAt: new Date().toISOString(),
              contentHash,
              attributionStatus: attribution,
              candidateType: 'commit',
              candidateTitle: commitMsg.split('\n')[0].slice(0, 100),
              candidateDescription: commitMsg.length > 100 ? commitMsg.slice(0, 500) : null,
              upstreamVisibility: repo.isPrivate ? 'private' : 'public',
              fingerprint: generateCandidateFingerprint('github', 'commit', commitSha),
            });
          }

          if (importedObjects.length > 0) {
            await this.repo.upsertImportedObjects(ownerId, repo.id, importedObjects);
            itemsImported += importedObjects.length;
          }

          if (candidates.length > 0) {
            await this.repo.createCandidates(ownerId, candidates);
            candidatesCreated += candidates.length;
          }

          if (commitRes.etag) {
            await this.repo.upsertCheckpoint(ownerId, repo.id, 'commit', { etag: commitRes.etag });
          }
        }

        // 2. Sync Releases
        const releaseRes = await client.get<any[]>(
          `/repos/${ownerName}/${repoName}/releases?per_page=10`,
        );
        lastRemaining = releaseRes.rateLimit.remaining;

        if (releaseRes.data && releaseRes.data.length > 0) {
          const relObjects: any[] = [];
          const relCandidates: any[] = [];

          for (const r of releaseRes.data) {
            const relId = String(r.id);
            const title = r.name || r.tag_name;
            const desc = r.body || '';
            const relUrl = r.html_url;

            relObjects.push({
              externalType: 'release',
              externalId: relId,
              contentHash: relId,
              rawPayloadSanitized: JSON.stringify({ name: title, tagName: r.tag_name }),
              sourceUrl: relUrl,
            });

            relCandidates.push({
              provider: 'github',
              externalType: 'release',
              externalId: relId,
              repositoryId: repo.id,
              sourceUrl: relUrl,
              sourceCreatedAt: r.created_at,
              capturedAt: new Date().toISOString(),
              contentHash: relId,
              attributionStatus: 'verified_owner',
              candidateType: 'release',
              candidateTitle: `Release ${title}`,
              candidateDescription: desc.slice(0, 500),
              upstreamVisibility: repo.isPrivate ? 'private' : 'public',
              fingerprint: generateCandidateFingerprint('github', 'release', relId),
            });
          }

          if (relObjects.length > 0) {
            await this.repo.upsertImportedObjects(ownerId, repo.id, relObjects);
            itemsImported += relObjects.length;
          }

          if (relCandidates.length > 0) {
            await this.repo.createCandidates(ownerId, relCandidates);
            candidatesCreated += relCandidates.length;
          }
        }
        await this.repo.completeRepositorySync(ownerId, repo.id, 'synced');
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('404')) {
          // Handle lost upstream access or force-pushed / deleted repository gracefully
          errors.push(`Upstream repository ${repo.fullName} missing or access revoked.`);
          await this.repo.completeRepositorySync(ownerId, repo.id, 'access_revoked');
        } else {
          errors.push(`Error syncing repo ${repo.fullName}: ${errMsg}`);
          await this.repo.completeRepositorySync(ownerId, repo.id, 'error');
        }
      }
    }

    return {
      success: errors.length === 0,
      repositoriesProcessed,
      itemsImported,
      candidatesCreated,
      rateLimitRemaining: lastRemaining,
      errorSummary: errors.length > 0 ? errors.join('; ') : null,
    };
  }
}
