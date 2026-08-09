/**
 * Evidence Ledger Private Routes (`/api/v1/private/evidence/*`).
 *
 * CRITICAL SECURITY CONTROLS (Gate 7 API & Security):
 *  1. Require verified owner authentication via `requireOwnerAuth()`.
 *  2. Server resolves `ownerId` — never accepts owner ID from client.
 *  3. Optimistic concurrency control via `version_no`.
 *  4. Single-target edge invariant validation on evidence links.
 *  5. Append-only verification events audit history.
 */

import { Hono } from 'hono';
import { D1EvidenceRepository } from '@usmanalii/database';
import { validateEvidenceLinkTarget } from '@usmanalii/evidence';
import {
  CreateEvidenceRequestSchema,
  UpdateEvidenceRequestSchema,
  RecordVerificationEventSchema,
  CreateEvidenceLinkRequestSchema,
} from '@usmanalii/contracts';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const evidenceRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

/** GET / — List evidence items for owner with filters */
evidenceRoutes.get('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const repo = new D1EvidenceRepository(c.env.DB);

  const evidenceType = c.req.query('type');
  const verificationState = c.req.query('verification');
  const visibility = c.req.query('visibility');
  const sourceType = c.req.query('source');
  const search = c.req.query('q');

  const filters: Record<string, string> = {};
  if (evidenceType) filters.evidenceType = evidenceType;
  if (verificationState) filters.verificationState = verificationState;
  if (visibility) filters.visibility = visibility;
  if (sourceType) filters.sourceType = sourceType;
  if (search) filters.search = search;

  const items = await repo.listForOwner(ownerId, filters);

  return c.json({ data: items, requestId: c.get('requestId') });
});

/** POST / — Create new evidence item */
evidenceRoutes.post('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const repo = new D1EvidenceRepository(c.env.DB);

  const body = await c.req.json().catch(() => null);
  const parseResult = CreateEvidenceRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid evidence creation parameters.',
        errors: parseResult.error.flatten(),
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const id = crypto.randomUUID();
  const d = parseResult.data;
  const created = await repo.create(ownerId, {
    id,
    evidenceType: d.evidenceType,
    sourceType: d.sourceType,
    title: d.title,
    ...(d.provider !== undefined ? { provider: d.provider } : {}),
    ...(d.externalId !== undefined ? { externalId: d.externalId } : {}),
    ...(d.canonicalLocator !== undefined ? { canonicalLocator: d.canonicalLocator } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.occurredAt !== undefined ? { occurredAt: d.occurredAt } : {}),
    ...(d.visibility !== undefined ? { visibility: d.visibility } : {}),
    ...(d.embargoUntil !== undefined ? { embargoUntil: d.embargoUntil } : {}),
  });

  return c.json({ data: created, requestId: c.get('requestId') }, 201);
});

/** GET /:id — Get single evidence item, verification history, and linked targets */
evidenceRoutes.get('/:id', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  const item = await repo.findById(ownerId, id);
  if (!item) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  const verificationHistory = await repo.getVerificationHistory(ownerId, id);
  const links = await repo.getLinksForEvidence(ownerId, id);

  return c.json({
    data: {
      item,
      verificationHistory,
      links,
    },
    requestId: c.get('requestId'),
  });
});

/** PUT /:id — Update evidence item with optimistic concurrency (`version_no`) */
evidenceRoutes.put('/:id', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  const body = await c.req.json().catch(() => null);
  const parseResult = UpdateEvidenceRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid evidence update parameters.',
        errors: parseResult.error.flatten(),
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const { versionNo, title, description, visibility, embargoUntil } = parseResult.data;
  const updates: import('@usmanalii/database').UpdateEvidenceInput = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (visibility !== undefined) updates.visibility = visibility;
  if (embargoUntil !== undefined) updates.embargoUntil = embargoUntil;

  const updateRes = await repo.updateWithConcurrency(ownerId, id, versionNo, updates);

  if (!updateRes.success) {
    if (updateRes.reason === 'concurrency_conflict') {
      return c.json(
        {
          code: 'CONFLICT',
          message:
            'Optimistic concurrency conflict: Evidence item has been modified by another session.',
          requestId: c.get('requestId'),
        },
        409,
      );
    }
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  return c.json({ data: updateRes.item, requestId: c.get('requestId') });
});

/** POST /:id/verify — Atomically record append-only verification event */
evidenceRoutes.post('/:id/verify', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  const body = await c.req.json().catch(() => null);
  const parseResult = RecordVerificationEventSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid verification event parameters.',
        errors: parseResult.error.flatten(),
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const { newState, verificationMethod, rationale } = parseResult.data;

  try {
    const res = await repo.recordVerificationEvent(
      ownerId,
      id,
      newState,
      verificationMethod,
      authContext?.authenticatedSubject || ownerId,
      rationale,
    );
    return c.json({ data: res, requestId: c.get('requestId') });
  } catch {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
});

/** POST /:id/archive & POST /:id/restore */
evidenceRoutes.post('/:id/archive', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  try {
    const archived = await repo.archive(ownerId, id);
    return c.json({ data: archived, requestId: c.get('requestId') });
  } catch {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
});

evidenceRoutes.post('/:id/restore', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  try {
    const restored = await repo.restore(ownerId, id);
    return c.json({ data: restored, requestId: c.get('requestId') });
  } catch {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
});

/** POST /:id/links — Create evidence link (typed edge) with single-target validation */
evidenceRoutes.post('/:id/links', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const repo = new D1EvidenceRepository(c.env.DB);

  const body = await c.req.json().catch(() => null);
  const parseResult = CreateEvidenceLinkRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid evidence link parameters.',
        errors: parseResult.error.flatten(),
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const targetValidation = validateEvidenceLinkTarget({
    targetType: parseResult.data.targetType,
    targetId: parseResult.data.targetId,
  } as import('@usmanalii/domain').EvidenceLinkTarget);

  if (!targetValidation.valid) {
    return c.json(
      {
        code: 'EVIDENCE_LINK_INVALID_TARGET',
        message: targetValidation.reason,
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const linkId = crypto.randomUUID();
  const createdLink = await repo.createLink(ownerId, id, {
    id: linkId,
    ...parseResult.data,
  });

  return c.json({ data: createdLink, requestId: c.get('requestId') }, 201);
});

/** DELETE /:id/links/:linkId — Delete evidence link */
evidenceRoutes.delete('/:id/links/:linkId', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = authContext?.ownerId || '00000000-0000-0000-0000-000000000001';
  const id = c.req.param('id');
  const linkId = c.req.param('linkId');
  const repo = new D1EvidenceRepository(c.env.DB);

  const deleted = await repo.deleteLink(ownerId, id, linkId);
  if (!deleted) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence link not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  return c.json({ message: 'Evidence link deleted.', requestId: c.get('requestId') });
});
