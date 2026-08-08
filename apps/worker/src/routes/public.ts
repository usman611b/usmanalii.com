/**
 * Public API Routes (`/api/v1/public/*`).
 *
 * CRITICAL SECURITY RULES (CRITICAL-02 & Privacy Safeguards):
 *  - Expose ONLY published, public records via allowlisted queries.
 *  - NEVER leak drafts, unlisted, restricted, or archived records.
 *  - Validate preview tokens cryptographically.
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';
import { D1ContentRepository } from '@usmanalii/database';
import type { ContentType } from '@usmanalii/domain';

export const publicRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

// Health check endpoint
publicRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', requestId: c.get('requestId') });
});

// Public profile endpoint
publicRoutes.get('/profile', (c) => {
  return c.json({
    displayName: 'Usman Ali',
    headline: 'Systems Architect & Senior Software Engineer',
    bio: 'Building evidence-backed systems, transparent software, and personal software architectures.',
    currentFocus: 'usmanalii.com — Personal Career OS',
    visibility: 'public',
    requestId: c.get('requestId'),
  });
});

// Contact form mutation endpoint
publicRoutes.post('/contact', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '');
  const message = String(body.message || '');

  if (!email || !message) {
    return c.json({ code: 'INVALID_PAYLOAD', message: 'Email and message are required.', requestId: c.get('requestId') }, 400);
  }

  return c.json({ success: true, status: 'sent', message: 'Thank you for reaching out.', requestId: c.get('requestId') });
});

// ----------------------------------------------------------------------------
// Public Journey Endpoints — Requirement 13, 14, 15, 16, 17
// ----------------------------------------------------------------------------

/** GET /api/v1/public/journey — List published public journey entries */
publicRoutes.get('/journey', async (c) => {
  const typeQuery = c.req.query('type');
  const dateQuery = c.req.query('date');
  const repo = new D1ContentRepository(c.env.DB);

  const filters: { contentType?: ContentType; yearMonth?: string } = {};
  if (typeQuery) filters.contentType = typeQuery as ContentType;
  if (dateQuery) filters.yearMonth = dateQuery;

  const items = await repo.getPublicPublishedEntries(filters);
  return c.json({ items, requestId: c.get('requestId') });
});

/** GET /api/v1/public/journey/:slug — Get published entry by slug */
publicRoutes.get('/journey/:slug', async (c) => {
  const slug = c.req.param('slug');
  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.getPublicPublishedEntryBySlug(slug);
  if (!found) {
    return c.json({ code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') }, 404);
  }

  const blocks = found.bodySnapshot ? JSON.parse(found.bodySnapshot) : [];

  return c.json({
    item: found.item,
    blocks,
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/journey/preview — Cryptographically validated exact public preview endpoint */
publicRoutes.get('/journey/preview', async (c) => {
  const id = c.req.query('id');
  const token = c.req.query('token');

  if (!id || !token) {
    return c.json({ code: 'INVALID_PREVIEW', message: 'Preview ID and token are required.', requestId: c.get('requestId') }, 400);
  }

  // Token format: id:expiresAt:signature
  const parts = token.split(':');
  if (parts.length !== 3 || parts[0] !== id) {
    return c.json({ code: 'INVALID_PREVIEW_TOKEN', message: 'Malformed preview token.', requestId: c.get('requestId') }, 403);
  }

  const expiresAt = Number(parts[1]);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return c.json({ code: 'PREVIEW_TOKEN_EXPIRED', message: 'Preview token has expired.', requestId: c.get('requestId') }, 403);
  }

  // Verify HMAC signature
  const tokenPayload = `${id}:${expiresAt}`;
  const signature = parts[2];
  if (!signature) {
    return c.json({ code: 'INVALID_PREVIEW_TOKEN', message: 'Missing token signature.', requestId: c.get('requestId') }, 403);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(c.env.CF_ACCESS_AUD_TAG || 'preview-secret-key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const hexBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const valid = await crypto.subtle.verify('HMAC', key, hexBytes, new TextEncoder().encode(tokenPayload));

  if (!valid) {
    return c.json({ code: 'INVALID_PREVIEW_SIGNATURE', message: 'Invalid preview token signature.', requestId: c.get('requestId') }, 403);
  }

  // Fetch item (bypasses state check for authenticated previewer)
  const itemStmt = c.env.DB.prepare(`SELECT * FROM content_items WHERE id = ? AND deleted_at IS NULL`).bind(id);
  const row = await itemStmt.first<Record<string, unknown>>();

  if (!row) {
    return c.json({ code: 'NOT_FOUND', message: 'Content item not found.', requestId: c.get('requestId') }, 404);
  }

  const revStmt = c.env.DB.prepare(`SELECT body_snapshot FROM content_revisions WHERE content_item_id = ? ORDER BY revision_no DESC LIMIT 1`).bind(id);
  const revRow = await revStmt.first<{ body_snapshot: string }>();

  return c.json({
    item: {
      id: row.id,
      contentType: row.content_type,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      visibility: row.visibility,
      state: row.state,
      occurredAt: row.occurred_at,
    },
    blocks: revRow ? JSON.parse(revRow.body_snapshot) : [],
    isPreview: true,
    requestId: c.get('requestId'),
  });
});
