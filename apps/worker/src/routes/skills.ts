import { Hono } from 'hono';
import { D1SkillRepository } from '@usmanalii/database';
import type { EntityId } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const skillRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

/** GET /api/v1/private/skills — List all owner skills */
skillRoutes.get('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const repo = new D1SkillRepository(c.env.DB);
  const category = c.req.query('category');
  const visibility = c.req.query('visibility');

  const options: { category?: string; visibility?: string } = {};
  if (category) options.category = category;
  if (visibility) options.visibility = visibility;

  const skills = await repo.listSkillsByOwner(ownerId, options);
  return c.json({ data: skills, count: skills.length, requestId: c.get('requestId') });
});

/** POST /api/v1/private/skills — Create new skill */
skillRoutes.post('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.owner_id || body.ownerId) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'owner_id cannot be supplied in body payload.', requestId: c.get('requestId') }, 400);
  }

  const name = String(body.name || '').trim();
  const slug = String(body.slug || body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (!name) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Skill name is required.', requestId: c.get('requestId') }, 400);
  }

  const repo = new D1SkillRepository(c.env.DB);
  const id = crypto.randomUUID() as EntityId;

  try {
    const skill = await repo.createSkill({
      id,
      ownerId,
      name,
      slug,
      description: body.description ? String(body.description) : null,
      category: body.category ? String(body.category) : 'engineering_practice',
      visibility: (body.visibility as 'private' | 'public') || 'private',
    });

    return c.json({ data: skill, message: 'Skill created successfully.', requestId: c.get('requestId') }, 201);
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.message?.includes('UNIQUE') || error?.message?.includes('slug')) {
      return c.json({ code: 'UNIQUE_CONSTRAINT', message: 'A skill with this slug already exists.', requestId: c.get('requestId') }, 400);
    }
    throw err;
  }
});

/** GET /api/v1/private/skills/:id — Get skill by ID */
skillRoutes.get('/:id', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const id = c.req.param('id') as EntityId;
  const repo = new D1SkillRepository(c.env.DB);

  const skill = await repo.getSkillById(ownerId, id);
  if (!skill) {
    return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Skill not found.', requestId: c.get('requestId') }, 404);
  }
  return c.json({ data: skill, requestId: c.get('requestId') });
});
