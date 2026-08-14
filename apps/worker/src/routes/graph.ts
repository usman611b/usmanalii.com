import { Hono } from 'hono';
import { D1CareerGraphRepository, D1GraphRepository } from '@usmanalii/database';
import { CreateCareerRoleRequestSchema, UpdateCareerRoleRequestSchema } from '@usmanalii/contracts';
import { validateSkillRelationship, type EntityId } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const graphRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

function graphFocusType(value: string | undefined) {
  const allowed = [
    'universe',
    'identity',
    'role',
    'project',
    'skill',
    'capability',
    'evidence',
    'journey',
    'artifact',
    'adr',
    'experiment',
    'debugging_lesson',
    'deployment',
  ] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as (typeof allowed)[number])
    : 'universe';
}

/** GET /career — Complete private semantic projection with bounded traversal. */
graphRoutes.get('/career', async (c) => {
  const authContext = c.get('authContext')!;
  const repo = new D1CareerGraphRepository(c.env.DB);
  const data = await repo.getProjection(authContext.ownerId, {
    publicOnly: false,
    focusType: graphFocusType(c.req.query('focusType')),
    focusId: c.req.query('focusId') || null,
    depth: Math.min(Math.max(Number(c.req.query('depth') || 2), 1), 5),
  });
  return c.json({ data, requestId: c.get('requestId') });
});

/** GET /roles — Owner-managed professional role clusters. */
graphRoutes.get('/roles', async (c) => {
  const authContext = c.get('authContext')!;
  const repo = new D1CareerGraphRepository(c.env.DB);
  const roles = await repo.listRoles(authContext);
  return c.json({ roles, requestId: c.get('requestId') });
});

/** POST /roles — Roles are explicit owner facts; never inferred automatically. */
graphRoutes.post('/roles', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = CreateCareerRoleRequestSchema.safeParse({
    name: body.name,
    slug: body.slug,
    description: body.description || null,
    color: body.color || '#8B5CF6',
  });
  if (!parsed.success) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Role name and a lowercase hyphenated slug are required.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }
  const repo = new D1CareerGraphRepository(c.env.DB);
  const role = await repo.createRole(authContext, {
    ...parsed.data,
    description: parsed.data.description ?? null,
  });
  return c.json({ role, requestId: c.get('requestId') }, 201);
});

graphRoutes.put('/roles/:id', async (c) => {
  const authContext = c.get('authContext')!;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const repo = new D1CareerGraphRepository(c.env.DB);
  const parsed = UpdateCareerRoleRequestSchema.safeParse({
    name: body.name,
    slug: body.slug,
    description: body.description || null,
    color: body.color || '#8B5CF6',
    visibility: body.visibility || 'private',
    publicationState: body.publication_state || body.publicationState || 'draft',
    versionNo: Number(body.version_no || body.versionNo || 1),
  });
  if (!parsed.success) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Role fields are invalid.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }
  try {
    await repo.updateRole(authContext, c.req.param('id'), {
      ...parsed.data,
      description: parsed.data.description ?? null,
    });
    return c.json({ message: 'Career role saved.', requestId: c.get('requestId') });
  } catch (error) {
    if (error instanceof Error && error.message === 'CONCURRENCY_CONFLICT') {
      return c.json(
        {
          code: 'CONCURRENCY_CONFLICT',
          message: 'Reload the role and try again.',
          requestId: c.get('requestId'),
        },
        409,
      );
    }
    throw error;
  }
});

/** GET /api/v1/private/graph/relationships — List all skill relationships */
graphRoutes.get('/relationships', async (c) => {
  const authContext = c.get('authContext')!;
  const ownerId = authContext.ownerId as EntityId;
  const repo = new D1GraphRepository(c.env.DB);

  const relationships = await repo.getSkillRelationshipsByOwner(ownerId);
  return c.json({
    data: relationships,
    count: relationships.length,
    requestId: c.get('requestId'),
  });
});

/** POST /api/v1/private/graph/relationships — Create skill-to-skill edge with cycle check */
graphRoutes.post('/relationships', async (c) => {
  const authContext = c.get('authContext')!;
  const ownerId = authContext.ownerId as EntityId;
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

  const sourceSkillId = String(body.sourceSkillId || '');
  const targetSkillId = String(body.targetSkillId || '');
  const relationshipType = String(body.relationshipType || 'related');
  const relevance = Number(body.relevance || 3);

  const repo = new D1GraphRepository(c.env.DB);
  const existingEdges = await repo.getSkillRelationshipsByOwner(ownerId);

  // Validate relationship & detect graph cycles
  const validation = validateSkillRelationship({
    sourceSkillId,
    targetSkillId,
    relationshipType,
    relevance,
    existingEdges: existingEdges.map((e) => ({
      sourceId: e.sourceSkillId,
      targetId: e.targetSkillId,
    })),
  });

  if (!validation.valid) {
    const code = validation.reason?.includes('cycle') ? 'CYCLE_DETECTED' : 'VALIDATION_ERROR';
    return c.json({ code, message: validation.reason, requestId: c.get('requestId') }, 400);
  }

  const id = crypto.randomUUID() as EntityId;
  try {
    const edge = await repo.createSkillRelationship({
      id,
      ownerId,
      sourceSkillId: sourceSkillId as EntityId,
      targetSkillId: targetSkillId as EntityId,
      relationshipType,
      relevance,
      ownerNote: body.ownerNote ? String(body.ownerNote) : null,
    });

    return c.json(
      { data: edge, message: 'Skill relationship created.', requestId: c.get('requestId') },
      201,
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.message?.includes('UNIQUE')) {
      return c.json(
        {
          code: 'DUPLICATE_EDGE',
          message: 'An active edge already exists for these skills.',
          requestId: c.get('requestId'),
        },
        400,
      );
    }
    throw err;
  }
});

/** POST /api/v1/private/graph/evidence-links — Link evidence to skill or capability */
graphRoutes.post('/evidence-links', async (c) => {
  const authContext = c.get('authContext')!;
  const ownerId = authContext.ownerId as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const evidenceId = String(body.evidenceId || '');
  const skillId = body.skillId ? String(body.skillId) : null;
  const capabilityId = body.capabilityId ? String(body.capabilityId) : null;
  const relationshipType = String(body.relationshipType || 'demonstrates');

  if (!evidenceId || (!skillId && !capabilityId) || (skillId && capabilityId)) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message:
          'Evidence link must reference exactly one evidence ID and exactly ONE skill ID or capability ID.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const repo = new D1GraphRepository(c.env.DB);
  const id = crypto.randomUUID() as EntityId;

  if (skillId) {
    const link = await repo.linkEvidenceToSkill({
      id,
      ownerId,
      evidenceId: evidenceId as EntityId,
      skillId: skillId as EntityId,
      relationshipType,
      ownerNote: body.ownerNote ? String(body.ownerNote) : null,
    });
    return c.json(
      { data: link, message: 'Evidence linked to skill.', requestId: c.get('requestId') },
      201,
    );
  } else {
    const link = await repo.linkEvidenceToCapability({
      id,
      ownerId,
      evidenceId: evidenceId as EntityId,
      capabilityId: capabilityId! as EntityId,
      relationshipType,
      ownerNote: body.ownerNote ? String(body.ownerNote) : null,
    });
    return c.json(
      { data: link, message: 'Evidence linked to capability.', requestId: c.get('requestId') },
      201,
    );
  }
});
