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
import { D1ContentRepository } from '@usmanalii/database';
import {
  ContentBodyV1Schema,
  compileJsonBlocksToMarkdown,
  validateContentForPublication,
  validateStateTransition,
  type ContentBlockV1,
} from '@usmanalii/content';
import type { ContentType, PublicationState, Visibility } from '@usmanalii/domain';

export const privateRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

// Apply requireOwnerAuth guard to ALL private routes
privateRoutes.use('*', requireOwnerAuth());

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
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be valid lowercase hyphenated string.'),
  summary: z.string().optional(),
  visibility: z.enum(['private', 'restricted', 'unlisted', 'public']).default('private'),
  occurredAt: z.string().optional(),
  blocks: ContentBodyV1Schema.default([]),
});

const UpdateContentItemSchema = z.object({
  title: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
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
    return c.json({ code: 'INVALID_PAYLOAD', errors: parseResult.error.errors, requestId: c.get('requestId') }, 400);
  }

  const repo = new D1ContentRepository(c.env.DB);
  const data = parseResult.data;

  // Check unique slug for owner
  const existing = await repo.findBySlug(authContext.ownerId, data.slug);
  if (existing) {
    return c.json({ code: 'SLUG_CONFLICT', message: `Slug "${data.slug}" is already in use.`, requestId: c.get('requestId') }, 409);
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
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
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
    return c.json({ code: 'INVALID_PAYLOAD', errors: parseResult.error.errors, requestId: c.get('requestId') }, 400);
  }

  const repo = new D1ContentRepository(c.env.DB);
  const data = parseResult.data;

  // Slug check if changing
  if (data.slug) {
    const existing = await repo.findBySlug(authContext.ownerId, data.slug);
    if (existing && existing.id !== id) {
      return c.json({ code: 'SLUG_CONFLICT', message: `Slug "${data.slug}" is already in use.`, requestId: c.get('requestId') }, 409);
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
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
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
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
  }

  const updated = await repo.transitionState(authContext.ownerId, id, 'archived');
  return c.json({ item: updated, message: 'Content item archived.', requestId: c.get('requestId') });
});

/** POST /api/v1/private/content/:id/state — State machine transition & publication validation */
privateRoutes.post('/content/:id/state', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const body = ((await c.req.json().catch(() => ({}))) as { targetState?: PublicationState });
  const targetState = body.targetState;

  if (!targetState) {
    return c.json({ code: 'INVALID_PAYLOAD', message: 'targetState is required.', requestId: c.get('requestId') }, 400);
  }

  const repo = new D1ContentRepository(c.env.DB);
  const found = await repo.findById(authContext.ownerId, id);

  if (!found) {
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
  }

  // 1. Validate state machine transition
  const transitionCheck = validateStateTransition(found.item.state, targetState);
  if (!transitionCheck.valid) {
    return c.json({ code: 'INVALID_TRANSITION', message: transitionCheck.reason, requestId: c.get('requestId') }, 400);
  }

  // 2. If targetState is 'published' or 'scheduled', execute 7-gate publication validation
  if (targetState === 'published' || targetState === 'scheduled') {
    const blocks: ContentBlockV1[] = found.latestBodySnapshot ? JSON.parse(found.latestBodySnapshot) : [];

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

    const linkedStatuses = await repo.getLinkedEntitiesStatus(authContext.ownerId, skillIds, capabilityIds, evidenceIds);

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
    return c.json({ revision: newRev, message: 'Rollback created as new revision.', requestId: c.get('requestId') });
  } catch (err: unknown) {
    const error = err as Error;
    return c.json({ code: 'ROLLBACK_FAILED', message: error.message, requestId: c.get('requestId') }, 400);
  }
});

/** GET /api/v1/private/content/:id/export/markdown — Automatic Portable Markdown Export */
privateRoutes.get('/content/:id/export/markdown', async (c) => {
  const authContext = c.get('authContext')!;
  const id = c.req.param('id');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
  }

  const blocks: ContentBlockV1[] = found.latestBodySnapshot ? JSON.parse(found.latestBodySnapshot) : [];
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
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
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
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(tokenPayload));
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
    return c.json({ code: 'PREVIEW_TOKEN_REQUIRED', message: 'Preview token parameter is required.', requestId: c.get('requestId') }, 400);
  }

  // Parse token payload: id:ownerId:versionNo:purpose:expiresAt:signature
  const parts = token.split(':');
  if (parts.length !== 6) {
    return c.json({ code: 'INVALID_PREVIEW_TOKEN', message: 'Malformed preview token structure.', requestId: c.get('requestId') }, 403);
  }

  const [tokenId, tokenOwnerId, tokenVersionNoStr, purpose, expiresAtStr, signature] = parts;
  if (!signature) {
    return c.json({ code: 'INVALID_PREVIEW_TOKEN', message: 'Missing token signature.', requestId: c.get('requestId') }, 403);
  }

  const expiresAt = Number(expiresAtStr);
  const tokenVersionNo = Number(tokenVersionNoStr);

  if (tokenId !== id || tokenOwnerId !== authContext.ownerId || purpose !== 'preview') {
    return c.json({ code: 'INVALID_PREVIEW_TOKEN', message: 'Preview token binding mismatch.', requestId: c.get('requestId') }, 403);
  }

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return c.json({ code: 'PREVIEW_TOKEN_EXPIRED', message: 'Preview token has expired.', requestId: c.get('requestId') }, 403);
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

  const hexBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const valid = await crypto.subtle.verify('HMAC', key, hexBytes, new TextEncoder().encode(tokenPayload));

  if (!valid) {
    return c.json({ code: 'INVALID_PREVIEW_SIGNATURE', message: 'Invalid preview token signature.', requestId: c.get('requestId') }, 403);
  }

  const found = await repo.findById(authContext.ownerId, id);
  if (!found) {
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
  }

  // Version invalidation check: editing content increments versionNo, invalidating old preview tokens
  if (found.item.versionNo !== tokenVersionNo) {
    return c.json({ code: 'PREVIEW_TOKEN_STALE', message: 'Content has been updated since this preview token was issued.', requestId: c.get('requestId') }, 403);
  }

  const blocks: ContentBlockV1[] = found.latestBodySnapshot ? JSON.parse(found.latestBodySnapshot) : [];

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

  const skillsStmt = db.prepare(`SELECT id, name AS label, 'skill' AS type, visibility FROM skills WHERE owner_id = ? AND archived_at IS NULL`).bind(authContext.ownerId);
  const capsStmt = db.prepare(`SELECT id, title AS label, 'capability' AS type, visibility FROM capabilities WHERE owner_id = ? AND archived_at IS NULL`).bind(authContext.ownerId);
  const projectsStmt = db.prepare(`SELECT id, title AS label, 'project' AS type, visibility FROM projects WHERE owner_id = ? AND archived_at IS NULL`).bind(authContext.ownerId);
  const evidenceStmt = db.prepare(`SELECT id, title AS label, 'evidence' AS type, visibility FROM evidence_items WHERE owner_id = ? AND archived_at IS NULL`).bind(authContext.ownerId);

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
