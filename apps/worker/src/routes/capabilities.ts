import { Hono } from 'hono';
import { D1CapabilityRepository } from '@usmanalii/database';
import { validateCapabilityWording, type EntityId } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const capabilityRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

/** GET /api/v1/private/capabilities — List all owner capabilities */
capabilityRoutes.get('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const repo = new D1CapabilityRepository(c.env.DB);
  const state = c.req.query('state');
  const visibility = c.req.query('visibility');

  const options: { state?: string; visibility?: string } = {};
  if (state) options.state = state;
  if (visibility) options.visibility = visibility;

  const capabilities = await repo.listCapabilitiesByOwner(ownerId, options);
  return c.json({ data: capabilities, count: capabilities.length, requestId: c.get('requestId') });
});

/** POST /api/v1/private/capabilities — Create new capability */
capabilityRoutes.post('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.owner_id || body.ownerId) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'owner_id cannot be supplied in body payload.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const title = String(body.title || '').trim();
  const description = String(body.description || title).trim();
  const outcomeStatement = String(body.outcomeStatement || description).trim();

  // Validate capability wording (structural length, non-empty, no percentages, no raw XSS)
  const validation = validateCapabilityWording(title, outcomeStatement);
  if (!validation.valid) {
    return c.json(
      { code: 'VALIDATION_ERROR', message: validation.reason, requestId: c.get('requestId') },
      400,
    );
  }

  const slug = String(body.slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const repo = new D1CapabilityRepository(c.env.DB);
  const id = crypto.randomUUID() as EntityId;

  try {
    const capability = await repo.createCapability({
      id,
      ownerId,
      title,
      slug,
      description,
      outcomeStatement,
      visibility: (body.visibility as 'private' | 'public') || 'private',
      state: (body.state as 'draft' | 'published') || 'draft',
    });

    return c.json(
      {
        data: capability,
        message: 'Capability created successfully.',
        requestId: c.get('requestId'),
      },
      201,
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.message?.includes('UNIQUE') || error?.message?.includes('slug')) {
      return c.json(
        {
          code: 'UNIQUE_CONSTRAINT',
          message: 'A capability with this slug already exists.',
          requestId: c.get('requestId'),
        },
        400,
      );
    }
    throw err;
  }
});

/** GET /api/v1/private/capabilities/:id — Get capability by ID */
capabilityRoutes.get('/:id', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const id = c.req.param('id') as EntityId;
  const repo = new D1CapabilityRepository(c.env.DB);

  const capability = await repo.getCapabilityById(ownerId, id);
  if (!capability) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Capability not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  return c.json({ data: capability, requestId: c.get('requestId') });
});
