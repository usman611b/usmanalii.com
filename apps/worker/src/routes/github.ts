/**
 * Private GitHub Integration API Routes (`/api/v1/private/integrations/github/*`).
 *
 * CRITICAL SECURITY RULES (CRITICAL-02 & IDOR Prevention):
 *  - Require verified owner `authContext` via `requireOwnerAuth()`.
 *  - All queries scope to `authContext.ownerId`.
 *  - GITHUB_TOKEN is NEVER returned in API responses or logged.
 */

import { Hono } from 'hono';
import { requireOwnerAuth, type AuthVariables } from '../middleware/auth.js';
import type { WorkerEnv } from '../index.js';
import { D1GitHubRepository } from '@usmanalii/database';
import { GitHubClient, GitHubSyncService } from '@usmanalii/evidence';

export const githubRoutes = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();

// Enforce owner authentication on all integration routes
githubRoutes.use('*', requireOwnerAuth());

/** GET /api/v1/private/integrations/github/status — Connection & rate limit status */
githubRoutes.get('/status', async (c) => {
  const authContext = c.get('authContext')!;
  const repo = new D1GitHubRepository(c.env.DB);
  const identity = await repo.getOwnerIdentity(authContext.ownerId);
  const repos = await repo.listRepositories(authContext.ownerId);
  const hasToken = Boolean(c.env.GITHUB_TOKEN);

  return c.json({
    status: hasToken && identity ? 'active' : 'inactive',
    hasToken,
    identity,
    repositoriesCount: repos.length,
    selectedCount: repos.filter((r) => r.selectedForSync).length,
    requestId: c.get('requestId'),
  });
});

/** PUT /api/v1/private/integrations/github/identity — Update owner identity mapping */
githubRoutes.put('/identity', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const githubUserId = Number(body.githubUserId);
  const githubLogin = body.githubLogin as string | undefined;
  const commitEmails = (body.commitEmails as string[]) || [];

  if (!githubUserId || isNaN(githubUserId) || !githubLogin) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'githubUserId and githubLogin are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1GitHubRepository(c.env.DB);
  const identity = await repo.upsertOwnerIdentity(authContext.ownerId, {
    githubUserId,
    githubLogin,
    commitEmails,
    verificationStatus: 'verified',
    ownerApproval: true,
  });

  return c.json({ identity, requestId: c.get('requestId') });
});

/** GET /api/v1/private/integrations/github/repositories — List repositories */
githubRoutes.get('/repositories', async (c) => {
  const authContext = c.get('authContext')!;
  const selectedOnly = c.req.query('selectedOnly') === 'true';
  const repo = new D1GitHubRepository(c.env.DB);
  const repositories = await repo.listRepositories(authContext.ownerId, selectedOnly);

  return c.json({ repositories, requestId: c.get('requestId') });
});

/** PUT /api/v1/private/integrations/github/repositories/:id/sync-toggle — Select/unselect repository */
githubRoutes.put('/repositories/:id/sync-toggle', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const selectedForSync = Boolean(body.selectedForSync);

  const repo = new D1GitHubRepository(c.env.DB);
  const updated = await repo.toggleRepositorySync(authContext.ownerId, id, selectedForSync);

  if (!updated) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Repository not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ success: true, selectedForSync, requestId: c.get('requestId') });
});

/** POST /api/v1/private/integrations/github/discover — Trigger repository discovery */
githubRoutes.post('/discover', async (c) => {
  const authContext = c.get('authContext')!;
  if (!c.env.GITHUB_TOKEN) {
    return c.json(
      {
        code: 'GITHUB_TOKEN_MISSING',
        message: 'GITHUB_TOKEN Worker secret is not set.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1GitHubRepository(c.env.DB);
  const client = new GitHubClient({ token: c.env.GITHUB_TOKEN });
  const service = new GitHubSyncService(repo);

  try {
    const res = await service.discoverRepositories(authContext.ownerId, client);
    return c.json({
      count: res.count,
      rateLimitRemaining: res.rateLimitRemaining,
      requestId: c.get('requestId'),
    });
  } catch (err) {
    return c.json(
      {
        code: 'SYNC_ERROR',
        message: err instanceof Error ? err.message : String(err),
        requestId: c.get('requestId'),
      },
      500,
    );
  }
});

/** POST /api/v1/private/integrations/github/sync — Trigger manual sync run */
githubRoutes.post('/sync', async (c) => {
  const authContext = c.get('authContext')!;
  if (!c.env.GITHUB_TOKEN) {
    return c.json(
      {
        code: 'GITHUB_TOKEN_MISSING',
        message: 'GITHUB_TOKEN Worker secret is not set.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const repoId = body.repoId as string | undefined;

  const repo = new D1GitHubRepository(c.env.DB);
  const client = new GitHubClient({ token: c.env.GITHUB_TOKEN });
  const service = new GitHubSyncService(repo);

  const opts = repoId !== undefined ? { repoId } : {};
  const result = await service.syncSelectedRepositories(authContext.ownerId, client, opts);
  return c.json({ result, requestId: c.get('requestId') });
});

/** GET /api/v1/private/integrations/github/candidates — List candidates */
githubRoutes.get('/candidates', async (c) => {
  const authContext = c.get('authContext')!;
  const reviewState = c.req.query('state') || undefined;
  const repo = new D1GitHubRepository(c.env.DB);
  const candidates = await repo.listCandidates(authContext.ownerId, reviewState);

  return c.json({ candidates, requestId: c.get('requestId') });
});

/** POST /api/v1/private/integrations/github/candidates/:id/accept — Accept candidate */
githubRoutes.post('/candidates/:id/accept', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const repo = new D1GitHubRepository(c.env.DB);
  try {
    const acceptOpts: { title?: string; description?: string; linkProjectId?: string } = {};
    if (body.title !== undefined) acceptOpts.title = body.title as string;
    if (body.description !== undefined) acceptOpts.description = body.description as string;
    if (body.linkProjectId !== undefined) acceptOpts.linkProjectId = body.linkProjectId as string;
    const result = await repo.acceptCandidate(authContext.ownerId, id, acceptOpts);
    return c.json({ ...result, requestId: c.get('requestId') });
  } catch (err) {
    return c.json(
      {
        code: 'ACCEPT_ERROR',
        message: err instanceof Error ? err.message : String(err),
        requestId: c.get('requestId'),
      },
      400,
    );
  }
});

/** POST /api/v1/private/integrations/github/candidates/:id/reject — Reject candidate */
githubRoutes.post('/candidates/:id/reject', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = (body.reason as string) || 'Rejected by owner';

  const repo = new D1GitHubRepository(c.env.DB);
  const rejected = await repo.rejectCandidate(authContext.ownerId, id, reason);
  if (!rejected) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Candidate not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ success: true, requestId: c.get('requestId') });
});

/** POST /api/v1/private/integrations/github/link-project — Link repository to project */
githubRoutes.post('/link-project', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const repositoryId = body.repositoryId as string | undefined;
  const projectId = (body.projectId as string) || null;

  if (!repositoryId) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'repositoryId is required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1GitHubRepository(c.env.DB);
  const updated = await repo.linkRepositoryToProject(authContext.ownerId, repositoryId, projectId);
  if (!updated) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Repository not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ success: true, repositoryId, projectId, requestId: c.get('requestId') });
});
