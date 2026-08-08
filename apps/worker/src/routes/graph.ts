import { Hono } from 'hono';
import { D1GraphRepository } from '@usmanalii/database';
import { validateSkillRelationship, type EntityId } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const graphRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

/** GET /api/v1/private/graph/relationships — List all skill relationships */
graphRoutes.get('/relationships', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const repo = new D1GraphRepository(c.env.DB);

  const relationships = await repo.getSkillRelationshipsByOwner(ownerId);
  return c.json({ data: relationships, count: relationships.length, requestId: c.get('requestId') });
});

/** POST /api/v1/private/graph/relationships — Create skill-to-skill edge with cycle check */
graphRoutes.post('/relationships', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.owner_id || body.ownerId) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'owner_id cannot be supplied in body payload.', requestId: c.get('requestId') }, 400);
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
    existingEdges: existingEdges.map((e) => ({ sourceId: e.sourceSkillId, targetId: e.targetSkillId })),
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

    return c.json({ data: edge, message: 'Skill relationship created.', requestId: c.get('requestId') }, 201);
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.message?.includes('UNIQUE')) {
      return c.json({ code: 'DUPLICATE_EDGE', message: 'An active edge already exists for these skills.', requestId: c.get('requestId') }, 400);
    }
    throw err;
  }
});

/** POST /api/v1/private/graph/evidence-links — Link evidence to skill or capability */
graphRoutes.post('/evidence-links', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const evidenceId = String(body.evidenceId || '');
  const skillId = body.skillId ? String(body.skillId) : null;
  const capabilityId = body.capabilityId ? String(body.capabilityId) : null;
  const relationshipType = String(body.relationshipType || 'demonstrates');

  if (!evidenceId || (!skillId && !capabilityId) || (skillId && capabilityId)) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Evidence link must reference exactly one evidence ID and exactly ONE skill ID or capability ID.', requestId: c.get('requestId') }, 400);
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
    return c.json({ data: link, message: 'Evidence linked to skill.', requestId: c.get('requestId') }, 201);
  } else {
    const link = await repo.linkEvidenceToCapability({
      id,
      ownerId,
      evidenceId: evidenceId as EntityId,
      capabilityId: capabilityId! as EntityId,
      relationshipType,
      ownerNote: body.ownerNote ? String(body.ownerNote) : null,
    });
    return c.json({ data: link, message: 'Evidence linked to capability.', requestId: c.get('requestId') }, 201);
  }
});
