/**
 * Private API Routes (`/api/v1/private/*`).
 *
 * CRITICAL SECURITY RULES (CRITICAL-02 & IDOR Prevention):
 *  - Require verified owner `authContext` via `requireOwnerAuth()`.
 *  - All queries scope to `authContext.ownerId`.
 *  - `owner_id` is NEVER accepted from client request bodies.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireOwnerAuth, type AuthVariables } from '../middleware/auth.js';
import type { WorkerEnv } from '../index.js';
import {
  D1ContentRepository,
  D1ProjectRepository,
  D1EngineeringRecordRepository,
  D1ProjectRelationshipRepository,
} from '@usmanalii/database';
import {
  ContentBodyV1Schema,
  compileJsonBlocksToMarkdown,
  validateContentForPublication,
  validateStateTransition,
  type ContentBlockV1,
} from '@usmanalii/content';
import {
  type ContentType,
  type PublicationState,
  type Visibility,
  type ProjectLifecycleState,
  type ProjectContributionType,
  type ExperimentStatus,
  type ProjectAdrStatus,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type ProjectVersionStatus,
  validateProjectWording,
  classifyAndValidateUrl,
  validateAdrSupersession,
  validateProjectRelationship,
  computeActivityHeatmap,
} from '@usmanalii/domain';
import { githubRoutes } from './github.js';

type OwnedLinkKind = 'project' | 'evidence' | 'artifact' | 'skill' | 'capability';

const OWNED_LINK_TABLES: Record<OwnedLinkKind, string> = {
  project: 'projects',
  evidence: 'evidence_items',
  artifact: 'artifacts',
  skill: 'skills',
  capability: 'capabilities',
};

export async function validateOwnedLinkIds(
  db: D1Database,
  ownerId: string,
  kind: OwnedLinkKind,
  ids: readonly string[],
): Promise<boolean> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return true;
  const placeholders = uniqueIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT id FROM ${OWNED_LINK_TABLES[kind]} WHERE owner_id = ? AND id IN (${placeholders})`,
    )
    .bind(ownerId, ...uniqueIds)
    .all<{ id: string }>();
  return (result.results ?? []).length === uniqueIds.length;
}

import { evidenceRoutes } from './evidence.js';
import { artifactRoutes } from './artifacts.js';
import { skillRoutes } from './skills.js';
import { capabilityRoutes } from './capabilities.js';
import { graphRoutes } from './graph.js';
import { suggestionRoutes } from './suggestions.js';

export const privateRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

// Apply requireOwnerAuth guard to ALL private routes
privateRoutes.use('*', requireOwnerAuth());

// Mount Sub-routers
privateRoutes.route('/evidence', evidenceRoutes);
privateRoutes.route('/artifacts', artifactRoutes);
privateRoutes.route('/skills', skillRoutes);
privateRoutes.route('/capabilities', capabilityRoutes);
privateRoutes.route('/graph', graphRoutes);
privateRoutes.route('/suggestions', suggestionRoutes);

// Dashboard summary stats
privateRoutes.get('/dashboard/summary', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || 'owner';
  const repo = new D1ContentRepository(c.env.DB);

  const items = await repo.listForOwner(ownerId);

  return c.json({
    authenticatedSubject: authContext?.authenticatedSubject,
    systemStatus: 'healthy',
    counts: {
      pendingApprovals: 0,
      draftContent: items.filter((i) => i.state === 'draft').length,
      publishedContent: items.filter((i) => i.state === 'published').length,
      unreviewedEvidence: 0,
      activeProjects: 0,
    },
    requestId: c.get('requestId'),
  });
});

// Full owner profile (includes private contactEmail)
privateRoutes.get('/profile', (c) => {
  const authContext = c.get('authContext');

  return c.json({
    id: authContext?.ownerId,
    ownerId: authContext?.ownerId,
    displayName: 'Usman Ali',
    headline: 'Software Engineer & Systems Architect',
    bio: 'Building evidence-backed systems, transparent software, and personal software architectures.',
    currentFocus: 'usmanalii.com — Personal Career OS',
    contactEmail: c.env.OWNER_EMAIL || 'owner@usmanalii.com',
    visibility: 'public',
    requestId: c.get('requestId'),
  });
});

// ----------------------------------------------------------------------------
// Content CRUD Endpoints — Requirement 4, 5, 6, 7, 8, 9, 12
// ----------------------------------------------------------------------------

const CreateContentItemSchema = z.object({
  contentType: z.enum(['note', 'journal', 'deep_dive', 'retrospective']),
  title: z.string().min(1, 'Title is required.'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be valid lowercase hyphenated string.'),
  summary: z.string().optional(),
  visibility: z.enum(['private', 'restricted', 'unlisted', 'public']).default('private'),
  occurredAt: z.string().optional(),
  blocks: ContentBodyV1Schema.default([]),
});

const UpdateContentItemSchema = z.object({
  title: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  summary: z.string().optional(),
  visibility: z.enum(['private', 'restricted', 'unlisted', 'public']).optional(),
  occurredAt: z.string().optional(),
  blocks: ContentBodyV1Schema.optional(),
  revisionNote: z.string().optional(),
  versionNo: z.number().int().min(1, 'versionNo is required for concurrency control.'),
});

/** GET /api/v1/private/content — List owner content items */
privateRoutes.get('/content', async (c) => {
  const authContext = c.get('authContext')!;
  const repo = new D1ContentRepository(c.env.DB);
  const stateQuery = c.req.query('state');
  const typeQuery = c.req.query('type');
  const searchQuery = c.req.query('q');

  const filters: { state?: PublicationState; contentType?: ContentType; search?: string } = {};
  if (stateQuery) filters.state = stateQuery as PublicationState;
  if (typeQuery) filters.contentType = typeQuery as ContentType;
  if (searchQuery) filters.search = searchQuery;

  const items = await repo.listForOwner(authContext.ownerId, filters);
  return c.json({ items, requestId: c.get('requestId') });
});

/** POST /api/v1/private/content — Create new draft content item */
privateRoutes.post('/content', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const parseResult = CreateContentItemSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json(
      { code: 'INVALID_PAYLOAD', errors: parseResult.error.errors, requestId: c.get('requestId') },
      400,
    );
  }

  const repo = new D1ContentRepository(c.env.DB);
  const data = parseResult.data;

  // Check unique slug for owner
  const existing = await repo.findBySlug(authContext.ownerId, data.slug);
  if (existing) {
    return c.json(
      {
        code: 'SLUG_CONFLICT',
        message: `Slug "${data.slug}" is already in use.`,
        requestId: c.get('requestId'),
      },
      409,
    );
  }

  const id = crypto.randomUUID();
  const created = await repo.createDraft(
    authContext.ownerId,
    {
      id,
      contentType: data.contentType as ContentType,
      title: data.title,
      slug: data.slug,
      summary: data.summary || null,
      visibility: data.visibility as Visibility,
      occurredAt: data.occurredAt || null,
      bodyBlocksJson: JSON.stringify(data.blocks),
    },
    authContext.authenticatedSubject,
  );

  return c.json({ item: created, requestId: c.get('requestId') }, 201);
});

/** GET /api/v1/private/content/:id — Get item details + body + revisions */
privateRoutes.get('/content/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const revisions = await repo.listRevisions(authContext.ownerId, id);
  const blocks = found.latestBodySnapshot ? JSON.parse(found.latestBodySnapshot) : [];

  return c.json({
    item: found.item,
    blocks,
    revisions,
    requestId: c.get('requestId'),
  });
});

/** PUT /api/v1/private/content/:id — Update item with optimistic concurrency */
privateRoutes.put('/content/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const parseResult = UpdateContentItemSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json(
      { code: 'INVALID_PAYLOAD', errors: parseResult.error.errors, requestId: c.get('requestId') },
      400,
    );
  }

  const repo = new D1ContentRepository(c.env.DB);
  const data = parseResult.data;

  // Slug check if changing
  if (data.slug) {
    const existing = await repo.findBySlug(authContext.ownerId, data.slug);
    if (existing && existing.id !== id) {
      return c.json(
        {
          code: 'SLUG_CONFLICT',
          message: `Slug "${data.slug}" is already in use.`,
          requestId: c.get('requestId'),
        },
        409,
      );
    }
  }

  const updateResult = await repo.updateWithConcurrency(
    authContext.ownerId,
    id,
    data.versionNo,
    {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      visibility: data.visibility as Visibility | undefined,
      occurredAt: data.occurredAt,
      bodyBlocksJson: data.blocks ? JSON.stringify(data.blocks) : undefined,
      revisionNote: data.revisionNote,
    },
    authContext.authenticatedSubject,
  );

  if (!updateResult.success) {
    if (updateResult.reason === 'concurrency_conflict') {
      return c.json(
        {
          code: 'CONCURRENCY_CONFLICT',
          message: 'Item has been modified by another edit. Please reload and retry.',
          requestId: c.get('requestId'),
        },
        409,
      );
    }
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({ item: updateResult.item, requestId: c.get('requestId') });
});

/** DELETE /api/v1/private/content/:id — Soft-delete / archive */
privateRoutes.delete('/content/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const updated = await repo.transitionState(authContext.ownerId, id, 'archived');
  return c.json({
    item: updated,
    message: 'Content item archived.',
    requestId: c.get('requestId'),
  });
});

/** POST /api/v1/private/content/:id/state — State machine transition & publication validation */
privateRoutes.post('/content/:id/state', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as { targetState?: PublicationState };
  const targetState = body.targetState;

  if (!targetState) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'targetState is required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1ContentRepository(c.env.DB);
  const found = await repo.findById(authContext.ownerId, id);

  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  // 1. Validate state machine transition
  const transitionCheck = validateStateTransition(found.item.state, targetState);
  if (!transitionCheck.valid) {
    return c.json(
      {
        code: 'INVALID_TRANSITION',
        message: transitionCheck.reason,
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  // 2. If targetState is 'published' or 'scheduled', execute 7-gate publication validation
  if (targetState === 'published' || targetState === 'scheduled') {
    const blocks: ContentBlockV1[] = found.latestBodySnapshot
      ? JSON.parse(found.latestBodySnapshot)
      : [];

    // Extract relationship tag entity IDs
    const skillIds: string[] = [];
    const capabilityIds: string[] = [];
    const evidenceIds: string[] = [];

    for (const b of blocks) {
      if (b.type === 'relationship_tag') {
        if (b.entityType === 'skill') skillIds.push(b.entityId);
        if (b.entityType === 'capability') capabilityIds.push(b.entityId);
        if (b.entityType === 'evidence') evidenceIds.push(b.entityId);
      }
    }

    const linkedStatuses = await repo.getLinkedEntitiesStatus(
      authContext.ownerId,
      skillIds,
      capabilityIds,
      evidenceIds,
    );

    const valResult = validateContentForPublication({
      id: found.item.id,
      title: found.item.title,
      slug: found.item.slug,
      summary: found.item.summary,
      occurredAt: found.item.occurredAt,
      visibility: found.item.visibility,
      blocks,
      linkedEntities: linkedStatuses,
    });

    if (!valResult.valid) {
      return c.json(
        {
          code: 'PUBLICATION_VALIDATION_FAILED',
          message: 'Publication validation gates failed.',
          reasons: valResult.reasons,
          requestId: c.get('requestId'),
        },
        422,
      );
    }
  }

  const updated = await repo.transitionState(authContext.ownerId, id, targetState);
  return c.json({ item: updated, requestId: c.get('requestId') });
});

/** POST /api/v1/private/content/:id/revisions/:revisionId/rollback — Rollback as a NEW revision */
privateRoutes.post('/content/:id/revisions/:revisionId/rollback', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const revisionId = c.req.param('revisionId');
  const repo = new D1ContentRepository(c.env.DB);

  try {
    const newRev = await repo.rollbackToRevision(
      authContext.ownerId,
      id,
      revisionId,
      authContext.authenticatedSubject,
    );
    return c.json({
      revision: newRev,
      message: 'Rollback created as new revision.',
      requestId: c.get('requestId'),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return c.json(
      { code: 'ROLLBACK_FAILED', message: error.message, requestId: c.get('requestId') },
      400,
    );
  }
});

/** GET /api/v1/private/content/:id/export/markdown — Automatic Portable Markdown Export */
privateRoutes.get('/content/:id/export/markdown', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const blocks: ContentBlockV1[] = found.latestBodySnapshot
    ? JSON.parse(found.latestBodySnapshot)
    : [];
  const markdown = compileJsonBlocksToMarkdown(
    {
      id: found.item.id,
      title: found.item.title,
      slug: found.item.slug,
      contentType: found.item.contentType,
      summary: found.item.summary,
      occurredAt: found.item.occurredAt,
      publishedAt: found.item.publishedAt,
      visibility: found.item.visibility,
      state: found.item.state,
      versionNo: found.item.versionNo,
    },
    blocks,
  );

  c.header('Content-Type', 'text/markdown; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${found.item.slug}.md"`);
  return c.text(markdown);
});

/** POST /api/v1/private/content/:id/preview-token — Signed preview token generator with bound version_no, owner_id, and purpose */
privateRoutes.post('/content/:id/preview-token', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  // Bind token to: id:ownerId:versionNo:purpose:expiresAt
  const expiresAt = Date.now() + 3600 * 1000; // 1 hour
  const purpose = 'preview';
  const tokenPayload = `${id}:${authContext.ownerId}:${found.item.versionNo}:${purpose}:${expiresAt}`;
  const secretKey = c.env.PREVIEW_SECRET || c.env.CF_ACCESS_AUD_TAG || 'preview-secret-key';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(tokenPayload),
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const token = `${tokenPayload}:${signature}`;
  return c.json({
    token,
    expiresAt,
    versionNo: found.item.versionNo,
    previewUrl: `/dashboard/journal/${id}/edit?preview=true&token=${encodeURIComponent(token)}`,
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/private/content/:id/preview — Authenticated, Access-protected preview endpoint (Gate 1, 2, 3) */
privateRoutes.get('/content/:id/preview', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const token = c.req.query('token');
  const repo = new D1ContentRepository(c.env.DB);

  // Set strict privacy & anti-indexing headers
  c.header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('Referrer-Policy', 'no-referrer');

  if (!token) {
    return c.json(
      {
        code: 'PREVIEW_TOKEN_REQUIRED',
        message: 'Preview token parameter is required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  // Parse token payload: id:ownerId:versionNo:purpose:expiresAt:signature
  const parts = token.split(':');
  if (parts.length !== 6) {
    return c.json(
      {
        code: 'INVALID_PREVIEW_TOKEN',
        message: 'Malformed preview token structure.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const [tokenId, tokenOwnerId, tokenVersionNoStr, purpose, expiresAtStr, signature] = parts;
  if (!signature) {
    return c.json(
      {
        code: 'INVALID_PREVIEW_TOKEN',
        message: 'Missing token signature.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const expiresAt = Number(expiresAtStr);
  const tokenVersionNo = Number(tokenVersionNoStr);

  if (tokenId !== id || tokenOwnerId !== authContext.ownerId || purpose !== 'preview') {
    return c.json(
      {
        code: 'INVALID_PREVIEW_TOKEN',
        message: 'Preview token binding mismatch.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return c.json(
      {
        code: 'PREVIEW_TOKEN_EXPIRED',
        message: 'Preview token has expired.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const tokenPayload = `${tokenId}:${tokenOwnerId}:${tokenVersionNoStr}:${purpose}:${expiresAtStr}`;
  const secretKey = c.env.PREVIEW_SECRET || c.env.CF_ACCESS_AUD_TAG || 'preview-secret-key';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const hexBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexBytes,
    new TextEncoder().encode(tokenPayload),
  );

  if (!valid) {
    return c.json(
      {
        code: 'INVALID_PREVIEW_SIGNATURE',
        message: 'Invalid preview token signature.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') },
      404,
    );
  }

  // Version invalidation check: editing content increments versionNo, invalidating old preview tokens
  if (found.item.versionNo !== tokenVersionNo) {
    return c.json(
      {
        code: 'PREVIEW_TOKEN_STALE',
        message: 'Content has been updated since this preview token was issued.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const blocks: ContentBlockV1[] = found.latestBodySnapshot
    ? JSON.parse(found.latestBodySnapshot)
    : [];

  return c.json({
    item: found.item,
    blocks,
    isPreview: true,
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/private/relationships/available — Fetch available entities for relationship pickers */
privateRoutes.get('/relationships/available', async (c) => {
  const authContext = c.get('authContext')!;
  const db = c.env.DB;

  const skillsStmt = db
    .prepare(
      `SELECT id, name AS label, 'skill' AS type, visibility FROM skills WHERE owner_id = ? AND archived_at IS NULL`,
    )
    .bind(authContext.ownerId);
  const capsStmt = db
    .prepare(
      `SELECT id, title AS label, 'capability' AS type, visibility FROM capabilities WHERE owner_id = ? AND archived_at IS NULL`,
    )
    .bind(authContext.ownerId);
  const projectsStmt = db
    .prepare(
      `SELECT id, title AS label, 'project' AS type, visibility FROM projects WHERE owner_id = ? AND archived_at IS NULL`,
    )
    .bind(authContext.ownerId);
  const evidenceStmt = db
    .prepare(
      `SELECT id, title AS label, 'evidence' AS type, visibility FROM evidence_items WHERE owner_id = ? AND archived_at IS NULL`,
    )
    .bind(authContext.ownerId);

  const [skills, caps, projects, evidence] = await Promise.all([
    skillsStmt.all<{ id: string; label: string; type: string; visibility: string }>(),
    capsStmt.all<{ id: string; label: string; type: string; visibility: string }>(),
    projectsStmt.all<{ id: string; label: string; type: string; visibility: string }>(),
    evidenceStmt.all<{ id: string; label: string; type: string; visibility: string }>(),
  ]);

  return c.json({
    skills: skills.results || [],
    capabilities: caps.results || [],
    projects: projects.results || [],
    evidence: evidence.results || [],
    requestId: c.get('requestId'),
  });
});

/**
 * Milestone M5 — Private Projects API Routes
 */

/** GET /api/v1/private/projects — List projects for owner */
privateRoutes.get('/projects', async (c) => {
  const authContext = c.get('authContext')!;
  const repo = new D1ProjectRepository(c.env.DB);
  const projects = await repo.listProjects(authContext.ownerId);
  return c.json({ projects, requestId: c.get('requestId') });
});

/** POST /api/v1/private/projects — Create project */
privateRoutes.post('/projects', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = body.title as string | undefined;
  const slug = body.slug as string | undefined;

  if (!title || !slug) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Title and slug are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const wordingCheck = validateProjectWording(title, (body.shortSummary as string) || null);
  if (!wordingCheck.valid) {
    return c.json(
      { code: 'INVALID_WORDING', message: wordingCheck.reason, requestId: c.get('requestId') },
      400,
    );
  }

  const repo = new D1ProjectRepository(c.env.DB);
  const existing = await repo.getProjectBySlug(authContext.ownerId, slug);
  if (existing) {
    return c.json(
      {
        code: 'SLUG_CONFLICT',
        message: `Slug "${slug}" is already in use.`,
        requestId: c.get('requestId'),
      },
      409,
    );
  }

  const id = `proj-${crypto.randomUUID()}`;
  const project = await repo.createProject({
    id,
    ownerId: authContext.ownerId,
    title,
    slug,
    shortSummary: (body.shortSummary as string) || null,
    detailedContext: (body.detailedContext as string) || null,
    problemStatement: (body.problemStatement as string) || null,
    goals: (body.goals as string[]) || [],
    nonGoals: (body.nonGoals as string[]) || [],
    constraints: (body.constraints as string[]) || [],
    role: (body.role as string) || null,
    contributionStatement: (body.contributionStatement as string) || null,
    collaborationContext: (body.collaborationContext as string) || null,
    startDate: (body.startDate as string) || null,
    endDate: (body.endDate as string) || null,
    ongoingStatus: Boolean(body.ongoingStatus),
    isFeatured: Boolean(body.isFeatured),
    recruiterSummary: (body.recruiterSummary as string) || null,
    deepDiveContent: (body.deepDiveContent as string) || null,
    repositoryReferences: (body.repositoryReferences as string[]) || [],
    liveDemoReferences: (body.liveDemoReferences as string[]) || [],
    heroArtifactId: (body.heroArtifactId as string) || null,
    caseStudyBody: (body.caseStudyBody as string) || null,
    scheduledFor: (body.scheduledFor as string) || null,
    embargoUntil: (body.embargoUntil as string) || null,
    provenance: (body.provenance as string) || '{}',
    ...(body.lifecycleState
      ? { lifecycleState: body.lifecycleState as ProjectLifecycleState }
      : {}),
    // Security boundary: creation always starts private/draft. Publication and
    // visibility changes require an authenticated update after review.
    publicationState: 'draft',
    visibility: 'private',
  });

  return c.json({ project, requestId: c.get('requestId') }, 201);
});

/** GET /api/v1/private/projects/:id — Get project detail with engineering records */
privateRoutes.get('/projects/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const projRepo = new D1ProjectRepository(c.env.DB);
  const engRepo = new D1EngineeringRecordRepository(c.env.DB);
  const relRepo = new D1ProjectRelationshipRepository(c.env.DB);

  const project = await projRepo.getProjectById(authContext.ownerId, id);
  if (!project) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const [contributions, experiments, adrs, debuggingLessons, deployments, versions, relationships] =
    await Promise.all([
      engRepo.listContributions(authContext.ownerId, id),
      engRepo.listExperiments(authContext.ownerId, id),
      engRepo.listAdrs(authContext.ownerId, id),
      engRepo.listDebuggingLessons(authContext.ownerId, id),
      engRepo.listDeployments(authContext.ownerId, id),
      engRepo.listVersions(authContext.ownerId, id),
      relRepo.listRelationships(authContext.ownerId, id),
    ]);

  return c.json({
    project,
    contributions,
    experiments,
    adrs,
    debuggingLessons,
    deployments,
    versions,
    relationships,
    requestId: c.get('requestId'),
  });
});

/** PUT /api/v1/private/projects/:id — Update project */
privateRoutes.put('/projects/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = body.title as string | undefined;
  if (title) {
    const wordingCheck = validateProjectWording(title, (body.shortSummary as string) || null);
    if (!wordingCheck.valid) {
      return c.json(
        { code: 'INVALID_WORDING', message: wordingCheck.reason, requestId: c.get('requestId') },
        400,
      );
    }
  }

  const repo = new D1ProjectRepository(c.env.DB);
  try {
    const updated = await repo.updateProject(authContext.ownerId, id, {
      ...(title ? { title } : {}),
      ...(body.slug ? { slug: body.slug as string } : {}),
      ...(body.shortSummary !== undefined ? { shortSummary: body.shortSummary as string } : {}),
      ...(body.detailedContext !== undefined
        ? { detailedContext: body.detailedContext as string }
        : {}),
      ...(body.problemStatement !== undefined
        ? { problemStatement: body.problemStatement as string }
        : {}),
      ...(body.goals ? { goals: body.goals as string[] } : {}),
      ...(body.nonGoals ? { nonGoals: body.nonGoals as string[] } : {}),
      ...(body.constraints ? { constraints: body.constraints as string[] } : {}),
      ...(body.role !== undefined ? { role: body.role as string } : {}),
      ...(body.contributionStatement !== undefined
        ? { contributionStatement: body.contributionStatement as string }
        : {}),
      ...(body.collaborationContext !== undefined
        ? { collaborationContext: body.collaborationContext as string }
        : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate as string } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate as string } : {}),
      ...(body.ongoingStatus !== undefined ? { ongoingStatus: Boolean(body.ongoingStatus) } : {}),
      ...(body.lifecycleState
        ? { lifecycleState: body.lifecycleState as ProjectLifecycleState }
        : {}),
      ...(body.publicationState
        ? { publicationState: body.publicationState as PublicationState }
        : {}),
      ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
      ...(body.scheduledFor !== undefined ? { scheduledFor: body.scheduledFor as string } : {}),
      ...(body.embargoUntil !== undefined ? { embargoUntil: body.embargoUntil as string } : {}),
      ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
      ...(body.recruiterSummary !== undefined
        ? { recruiterSummary: body.recruiterSummary as string }
        : {}),
      ...(body.deepDiveContent !== undefined
        ? { deepDiveContent: body.deepDiveContent as string }
        : {}),
      ...(body.repositoryReferences
        ? { repositoryReferences: body.repositoryReferences as string[] }
        : {}),
      ...(body.liveDemoReferences
        ? { liveDemoReferences: body.liveDemoReferences as string[] }
        : {}),
      ...(body.heroArtifactId !== undefined
        ? { heroArtifactId: body.heroArtifactId as string }
        : {}),
      ...(body.caseStudyBody !== undefined ? { caseStudyBody: body.caseStudyBody as string } : {}),
      ...(body.expectedVersionNo ? { expectedVersionNo: body.expectedVersionNo as number } : {}),
    });

    if (body.caseStudyBody) {
      await repo.createRevisionSnapshot(
        authContext.ownerId,
        id,
        body.caseStudyBody as string,
        body.revisionNote as string,
      );
    }

    return c.json({ project: updated, requestId: c.get('requestId') });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('CONCURRENCY_CONFLICT')) {
      return c.json(
        { code: 'CONCURRENCY_CONFLICT', message: errMsg, requestId: c.get('requestId') },
        409,
      );
    }
    return c.json(
      { code: 'NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }
});

/** GET /api/v1/private/projects/:id/revisions — List revision history */
privateRoutes.get('/projects/:id/revisions', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ProjectRepository(c.env.DB);
  const revisions = await repo.listRevisions(authContext.ownerId, id);
  return c.json({ revisions, requestId: c.get('requestId') });
});

/** POST /api/v1/private/projects/:id/revisions/:version/rollback — Rollback to revision */
privateRoutes.post('/projects/:id/revisions/:version/rollback', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const targetRevNo = Number(c.req.param('version'));

  if (isNaN(targetRevNo) || targetRevNo < 1) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Valid positive integer revision number is required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1ProjectRepository(c.env.DB);
  try {
    const updated = await repo.rollbackToRevision(authContext.ownerId, id, targetRevNo);
    return c.json({ project: updated, requestId: c.get('requestId') });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('REVISION_NOT_FOUND')) {
      return c.json(
        { code: 'REVISION_NOT_FOUND', message: errMsg, requestId: c.get('requestId') },
        404,
      );
    }
    return c.json(
      { code: 'NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }
});

/** POST /api/v1/private/projects/:id/contributions — Create contribution */
privateRoutes.post('/projects/:id/contributions', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (!body.contributionType || !body.description) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'contributionType and description are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'evidence', supportingEvidenceIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);
  const contribution = await repo.createContribution({
    id: `contrib-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    contributionType: body.contributionType as ProjectContributionType,
    description: body.description as string,
    scope: (body.scope as string) || null,
    startDate: (body.startDate as string) || null,
    endDate: (body.endDate as string) || null,
    collaborationContext: (body.collaborationContext as string) || null,
    supportingEvidenceIds,
    // Attribution, approval, verification, and public visibility are never
    // mass-assigned from a creation payload.
    ownerApproval: false,
    verificationState: 'unverified',
    visibility: 'private',
  });

  return c.json({ contribution, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/experiments — Create experiment */
privateRoutes.post('/projects/:id/experiments', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = body.title as string | undefined;
  const hypothesis = body.hypothesis as string | undefined;
  const methodology = body.methodology as string | undefined;

  if (!title || !hypothesis || !methodology) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'title, hypothesis, and methodology are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  const artifactIds = (body.artifactIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(
      c.env.DB,
      authContext.ownerId,
      'evidence',
      supportingEvidenceIds,
    )) ||
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'artifact', artifactIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence or artifact is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);
  const experiment = await repo.createExperiment({
    id: `exp-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    title,
    slug: (body.slug as string) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    hypothesis,
    motivation: (body.motivation as string) || null,
    methodology,
    variables: (body.variables as string[]) || [],
    inputs: (body.inputs as string) || null,
    results: (body.results as string) || null,
    conclusion: (body.conclusion as string) || null,
    limitations: (body.limitations as string) || null,
    dates: (body.dates as string) || null,
    supportingEvidenceIds,
    artifactIds,
    ...(body.status ? { status: body.status as ExperimentStatus } : {}),
    ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
    ...(body.state ? { state: body.state as PublicationState } : {}),
  });

  return c.json({ experiment, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/adrs — Create ADR */
privateRoutes.post('/projects/:id/adrs', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = body.title as string | undefined;
  const context = body.context as string | undefined;
  const decision = body.decision as string | undefined;
  const consequences = body.consequences as string | undefined;
  const adrNumber = body.adrNumber as number | undefined;

  if (!title || !context || !decision || !consequences || adrNumber === undefined) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'adrNumber, title, context, decision, and consequences are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'evidence', supportingEvidenceIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);

  if (body.supersededBy) {
    const existingAdrs = await repo.listAdrs(authContext.ownerId, projectId);
    const cycleCheck = validateAdrSupersession(
      existingAdrs,
      `adr-${adrNumber}`,
      body.supersededBy as string,
    );
    if (!cycleCheck.valid) {
      return c.json(
        { code: 'SUPERSESSION_CYCLE', message: cycleCheck.reason, requestId: c.get('requestId') },
        400,
      );
    }
  }

  const adr = await repo.createAdr({
    id: `adr-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    adrNumber,
    title,
    slug:
      (body.slug as string) ||
      `adr-${adrNumber}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    context,
    decision,
    consequences,
    alternativesConsidered: (body.alternativesConsidered as string[]) || [],
    rationale: (body.rationale as string) || null,
    tradeOffs: (body.tradeOffs as string) || null,
    supersededBy: (body.supersededBy as string) || null,
    decisionDate: (body.decisionDate as string) || null,
    supportingEvidenceIds,
    ...(body.status ? { status: body.status as ProjectAdrStatus } : {}),
    ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
    ...(body.state ? { state: body.state as PublicationState } : {}),
  });

  return c.json({ adr, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/debugging — Create debugging lesson */
privateRoutes.post('/projects/:id/debugging', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = body.title as string | undefined;
  const symptom = body.symptom as string | undefined;
  const rootCause = body.rootCause as string | undefined;
  const resolution = body.resolution as string | undefined;
  const prevention = body.prevention as string | undefined;

  if (!title || !symptom || !rootCause || !resolution || !prevention) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'title, symptom, rootCause, resolution, and prevention are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  const artifactIds = (body.artifactIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(
      c.env.DB,
      authContext.ownerId,
      'evidence',
      supportingEvidenceIds,
    )) ||
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'artifact', artifactIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence or artifact is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);
  const lesson = await repo.createDebuggingLesson({
    id: `debug-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    title,
    slug: (body.slug as string) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    symptom,
    impact: (body.impact as string) || null,
    environment: (body.environment as string) || null,
    investigation: (body.investigation as string) || null,
    rootCause,
    resolution,
    prevention,
    lessonsLearned: (body.lessonsLearned as string) || null,
    relevantDates: (body.relevantDates as string) || null,
    tags: (body.tags as string[]) || [],
    supportingEvidenceIds,
    artifactIds,
    ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
    ...(body.state ? { state: body.state as PublicationState } : {}),
  });

  return c.json({ lesson, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/deployments — Create deployment record */
privateRoutes.post('/projects/:id/deployments', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const environment = body.environment as DeploymentEnvironment | undefined;
  const releaseVersion = body.releaseVersion as string | undefined;
  const deploymentUrl = body.deploymentUrl as string | undefined;

  if (!environment || !releaseVersion) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'environment and releaseVersion are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  const artifactIds = (body.artifactIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(
      c.env.DB,
      authContext.ownerId,
      'evidence',
      supportingEvidenceIds,
    )) ||
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'artifact', artifactIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence or artifact is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  if (deploymentUrl) {
    const urlCheck = classifyAndValidateUrl(
      deploymentUrl,
      environment === 'production' ? 'public_deployment' : 'preview_staging',
    );
    if (!urlCheck.valid) {
      return c.json(
        { code: 'INVALID_URL', message: urlCheck.reason, requestId: c.get('requestId') },
        400,
      );
    }
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);
  const deployment = await repo.createDeployment({
    id: `dep-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    environment,
    releaseVersion,
    gitSha: (body.gitSha as string) || null,
    deploymentUrl: deploymentUrl || null,
    startedAt: (body.startedAt as string) || null,
    deployedAt: (body.deployedAt as string) || new Date().toISOString(),
    rollbackInfo: (body.rollbackInfo as string) || null,
    outcome: (body.outcome as string) || null,
    supportingEvidenceIds,
    artifactIds,
    ...(body.status ? { status: body.status as DeploymentStatus } : {}),
    ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
    ...(body.publicationState
      ? { publicationState: body.publicationState as PublicationState }
      : {}),
  });

  return c.json({ deployment, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/versions — Create project version/milestone */
privateRoutes.post('/projects/:id/versions', async (c) => {
  const authContext = c.get('authContext')!;
  const projectId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = body.name as string | undefined;
  const versionIdentifier = body.versionIdentifier as string | undefined;

  if (!name || !versionIdentifier) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'name and versionIdentifier are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const supportingEvidenceIds = (body.supportingEvidenceIds as string[]) || [];
  const artifactIds = (body.artifactIds as string[]) || [];
  if (
    !(await validateOwnedLinkIds(
      c.env.DB,
      authContext.ownerId,
      'evidence',
      supportingEvidenceIds,
    )) ||
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, 'artifact', artifactIds))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Linked evidence or artifact is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1EngineeringRecordRepository(c.env.DB);
  const version = await repo.createVersion({
    id: `ver-${crypto.randomUUID()}`,
    projectId,
    ownerId: authContext.ownerId,
    name,
    versionIdentifier,
    description: (body.description as string) || null,
    startedDate: (body.startedDate as string) || null,
    completedDate: (body.completedDate as string) || null,
    changelog: (body.changelog as string) || null,
    outcome: (body.outcome as string) || null,
    supportingEvidenceIds,
    artifactIds,
    previousVersionId: (body.previousVersionId as string) || null,
    ...(body.status ? { status: body.status as ProjectVersionStatus } : {}),
    ...(body.visibility ? { visibility: body.visibility as Visibility } : {}),
    ...(body.state ? { state: body.state as PublicationState } : {}),
  });

  return c.json({ version, requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/projects/:id/relationships — Create relationship */
privateRoutes.post('/projects/:id/relationships', async (c) => {
  const authContext = c.get('authContext')!;
  const sourceId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const targetId = body.targetId as string | undefined;
  const targetType = body.targetType as string | undefined;
  const relationshipType = body.relationshipType as string | undefined;
  const relevance = (body.relevance as number) ?? 1;

  if (!targetId || !targetType || !relationshipType) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'targetId, targetType, and relationshipType are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  if (!['project', 'evidence', 'artifact', 'skill', 'capability'].includes(targetType)) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Unsupported relationship target type.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }
  if (
    !(await validateOwnedLinkIds(c.env.DB, authContext.ownerId, targetType as OwnedLinkKind, [
      targetId,
    ]))
  ) {
    return c.json(
      {
        code: 'INVALID_LINK_REFERENCE',
        message: 'Relationship target is outside the owner scope.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const check = validateProjectRelationship({
    sourceId,
    targetId,
    relationshipType,
    relevance,
  });

  if (!check.valid) {
    return c.json(
      { code: 'INVALID_RELATIONSHIP', message: check.reason, requestId: c.get('requestId') },
      400,
    );
  }

  const repo = new D1ProjectRelationshipRepository(c.env.DB);
  try {
    const relationship = await repo.createRelationship({
      id: `rel-${crypto.randomUUID()}`,
      ownerId: authContext.ownerId,
      sourceId,
      sourceType: (body.sourceType as string) || 'project',
      targetId,
      targetType,
      relationshipType,
      relevance,
      displayOrder: body.displayOrder as number,
      ownerNote: body.ownerNote as string,
    });
    return c.json({ relationship, requestId: c.get('requestId') }, 201);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('idx_project_rel_active')) {
      return c.json(
        {
          code: 'DUPLICATE_EDGE',
          message: 'An active relationship between these entities already exists.',
          requestId: c.get('requestId'),
        },
        409,
      );
    }
    throw err;
  }
});

/** Mount GitHub integration routes (`/api/v1/private/integrations/github/*`) */
privateRoutes.route('/integrations/github', githubRoutes);

/** GET /api/v1/private/activity — Private activity ledger & heatmap projection */
privateRoutes.get('/activity', async (c) => {
  const authContext = c.get('authContext')!;
  const timezone = c.req.query('timezone') || 'Asia/Karachi';
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 86400 * 1000).toISOString();
  const nowIso = now.toISOString();

  // Query ALL owner activity events from D1 (including private)
  const sql = `
    SELECT id, captured_at as date_iso, evidence_type as type, visibility, 'published' as state
    FROM evidence_items
    WHERE owner_id = ? AND archived_at IS NULL
    UNION ALL
    SELECT id, created_at as date_iso, 'journal_entry' as type, visibility, state
    FROM content_items
    WHERE owner_id = ? AND deleted_at IS NULL
    UNION ALL
    SELECT id, deployed_at as date_iso, 'deployment' as type, visibility, publication_state as state
    FROM deployments
    WHERE owner_id = ? AND deleted_at IS NULL
  `;

  const { results } = await c.env.DB.prepare(sql).bind(authContext.ownerId, authContext.ownerId, authContext.ownerId).all<Record<string, unknown>>();
  const events = (results ?? []).map((row) => ({
    id: String(row.id),
    dateIso: String(row.date_iso || new Date().toISOString()),
    type: String(row.type),
    visibility: String(row.visibility) as Visibility,
    isPublished: row.state === 'published',
  }));

  const projection = computeActivityHeatmap(events, oneYearAgo, nowIso, timezone, false);
  return c.json({ projection, requestId: c.get('requestId') });
});
