/**
 * GitHub Synchronization Service — Milestone M6.
 *
 * Directives:
 *  - Orchestrates incremental, idempotent GitHub REST data synchronization
 *  - Generates evidence candidates and records checkpoints
 *  - Prevents secret leaks, respects rate limits, handles partial failures
 */

import {
  generateCandidateFingerprint,
  matchCommitAttribution,
} from '@usmanalii/domain';
import type { D1GitHubRepository } from '@usmanalii/database';
import type { GitHubClient } from './github-client.js';

export interface SyncRunResult {
  readonly success: boolean;
  readonly repositoriesProcessed: number;
  readonly itemsImported: number;
  readonly candidatesCreated: number;
  readonly rateLimitRemaining: number;
  readonly errorSummary: string | null;
}

export class GitHubSyncService {
  constructor(private readonly repo: D1GitHubRepository) {}

  /**
   * Discovers repositories for owner identity.
   */
  async discoverRepositories(
    ownerId: string,
    client: GitHubClient,
  ): Promise<{ count: number; rateLimitRemaining: number }> {
    const res = await client.get<any[]>('/user/repos?per_page=100&sort=updated');
    if (!res.data) {
      return { count: 0, rateLimitRemaining: res.rateLimit.remaining };
    }

    const repoList = res.data.map((r: any) => ({
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
      limitTotal: res.rateLimit.limit,
      remaining: res.rateLimit.remaining,
      resetAt: res.rateLimit.resetAt,
      used: res.rateLimit.limit - res.rateLimit.remaining,
    });

    return { count: repoList.length, rateLimitRemaining: res.rateLimit.remaining };
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
      selectedRepos = selectedRepos.filter((r) => r.id === options.repoId || String(r.githubRepoId) === options.repoId);
    }

    let repositoriesProcessed = 0;
    let itemsImported = 0;
    let candidatesCreated = 0;
    let lastRemaining = 5000;
    const errors: string[] = [];

    for (const repo of selectedRepos) {
      // Stop sync if rate limit is dangerously low (< 50 remaining)
      if (lastRemaining < 50) {
        errors.push(`Rate limit low (${lastRemaining} remaining); stopping sync run early.`);
        break;
      }

      try {
        repositoriesProcessed += 1;
        const [ownerName, repoName] = repo.fullName.split('/');

        // 1. Sync Commits (Bounded to 30 recent commits)
        const checkpoint = await this.repo.getCheckpoint(ownerId, repo.id, 'commit');
        const commitRes = await client.get<any[]>(`/repos/${ownerName}/${repoName}/commits?per_page=30`, {
          etag: checkpoint?.etag,
        });

        lastRemaining = commitRes.rateLimit.remaining;

        if (!commitRes.notModified && commitRes.data) {
          const importedObjects: any[] = [];
          const candidates: any[] = [];

          for (const c of commitRes.data) {
            const commitSha = c.sha;
            const sourceUrl = c.html_url || `https://github.com/${repo.fullName}/commit/${commitSha}`;
            const commitMsg = c.commit?.message || 'Commit update';
            const commitDate = c.commit?.author?.date || c.commit?.committer?.date || new Date().toISOString();

            const attribution = matchCommitAttribution(
              {
                authorId: c.author?.id,
                authorLogin: c.author?.login,
                authorEmail: c.commit?.author?.email,
                committerId: c.committer?.id,
                committerLogin: c.committer?.login,
                committerEmail: c.commit?.committer?.email,
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
        const releaseRes = await client.get<any[]>(`/repos/${ownerName}/${repoName}/releases?per_page=10`);
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
      } catch (err) {
        errors.push(`Error syncing repo ${repo.fullName}: ${err instanceof Error ? err.message : String(err)}`);
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
