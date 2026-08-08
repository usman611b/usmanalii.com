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
  if (slug === 'preview') {
    return c.json({ code: 'NOT_FOUND', message: 'Preview endpoint has been moved under Cloudflare Access protected private routes.', requestId: c.get('requestId') }, 404);
  }
  if (!c.env?.DB) {
    return c.json({ code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') }, 404);
  }

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


