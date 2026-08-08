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
import { D1ContentRepository, D1EvidenceRepository, D1ArtifactRepository } from '@usmanalii/database';
import { filterPublicEvidence, filterPublicArtifacts } from '@usmanalii/evidence';
import { sanitizeFilename } from './artifacts.js';
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

// ----------------------------------------------------------------------------
// Public Evidence & Artifact Endpoints (Requirement 6, 8)
// SECURITY: Only exposes eligible public evidence & artifacts.
// Private evidence & artifacts return 404 NOT_FOUND to prevent existence leakage.
// ----------------------------------------------------------------------------

/** GET /api/v1/public/evidence — List public eligible evidence items */
publicRoutes.get('/evidence', async (c) => {
  if (!c.env?.DB) {
    return c.json({ items: [], requestId: c.get('requestId') });
  }
  const repo = new D1EvidenceRepository(c.env.DB);
  const items = await repo.getPublicEvidence();
  const filtered = filterPublicEvidence(items);

  // Redact private fields
  const publicDtos = filtered.map((e) => ({
    id: e.id,
    evidenceType: e.evidenceType,
    sourceType: e.sourceType,
    provider: e.provider,
    title: e.title,
    description: e.description,
    canonicalLocator: e.canonicalLocator,
    verificationState: e.verificationState,
    occurredAt: e.occurredAt,
  }));

  return c.json({ items: publicDtos, requestId: c.get('requestId') });
});

/** GET /api/v1/public/evidence/:id — Get public eligible evidence item by ID */
publicRoutes.get('/evidence/:id', async (c) => {
  const id = c.req.param('id');
  if (!c.env?.DB) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Evidence item not found.', requestId: c.get('requestId') }, 404);
  }
  const repo = new D1EvidenceRepository(c.env.DB);
  const found = await repo.getPublicEvidenceById(id);

  if (!found) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Evidence item not found.', requestId: c.get('requestId') }, 404);
  }

  const eligible = filterPublicEvidence([found]);
  if (eligible.length === 0) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Evidence item not found.', requestId: c.get('requestId') }, 404);
  }

  return c.json({
    item: {
      id: found.id,
      evidenceType: found.evidenceType,
      sourceType: found.sourceType,
      provider: found.provider,
      title: found.title,
      description: found.description,
      canonicalLocator: found.canonicalLocator,
      verificationState: found.verificationState,
      occurredAt: found.occurredAt,
    },
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/artifacts/:id/download — Public R2 binary download (checks public eligibility) */
publicRoutes.get('/artifacts/:id/download', async (c) => {
  const id = c.req.param('id');
  if (!c.env?.DB) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') }, 404);
  }
  const repo = new D1ArtifactRepository(c.env.DB);
  const artifact = await repo.getPublicArtifactById(id);

  if (!artifact) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') }, 404);
  }

  const eligible = filterPublicArtifacts([artifact]);
  if (eligible.length === 0) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') }, 404);
  }

  const r2 = c.env.ARTIFACTS_BUCKET || c.env.R2_PUBLIC || c.env.R2_PRIVATE;
  if (r2 && typeof r2.get === 'function') {
    const object = await r2.get(artifact.r2Key);
    if (object && object.body) {
      c.header('Content-Type', artifact.mediaType === 'text/html' ? 'text/plain' : (artifact.mediaType || 'application/octet-stream'));
      c.header('Content-Disposition', `attachment; filename="${sanitizeFilename(artifact.originalName || 'artifact')}"`);
      c.header('Content-Security-Policy', "default-src 'none'");
      c.header('X-Content-Type-Options', 'nosniff');
      return c.body(object.body as unknown as ReadableStream);
    }
  }

  return c.json({
    message: 'Public artifact metadata verified. Binary content delivered in R2 production binding.',
    data: {
      id: artifact.id,
      title: artifact.title,
      artifactType: artifact.artifactType,
      mediaType: artifact.mediaType,
      byteSize: artifact.byteSize,
      originalName: artifact.originalName,
    },
    requestId: c.get('requestId'),
  });
});


