import { Hono } from 'hono';
import { D1SkillRepository } from '@usmanalii/database';
import type { EntityId, ISODateTime, ProgressionStage } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';
import { getSkillProjection } from './knowledge-projections.js';

export const skillRoutes = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();

const owner = (context: { get(name: 'authContext'): AuthVariables['authContext'] }) =>
  (context.get('authContext')?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
const slugify = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const aliases = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

skillRoutes.get('/', async (c) => {
  const repo = new D1SkillRepository(c.env.DB);
  const options: { category?: string; visibility?: string } = {};
  const category = c.req.query('category');
  const visibility = c.req.query('visibility');
  if (category) options.category = category;
  if (visibility) options.visibility = visibility;
  const skills = await repo.listSkillsByOwner(owner(c), options);
  return c.json({ data: skills, count: skills.length, requestId: c.get('requestId') });
});

skillRoutes.post('/', async (c) => {
  const ownerId = owner(c);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.owner_id || body.ownerId)
    return c.json({ code: 'VALIDATION_ERROR', message: 'owner_id cannot be supplied.' }, 400);
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (!name || !slug)
    return c.json(
      { code: 'VALIDATION_ERROR', message: 'Name and a valid slug are required.' },
      400,
    );
  try {
    const skill = await new D1SkillRepository(c.env.DB).createSkill({
      id: crypto.randomUUID() as EntityId,
      ownerId,
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      aliases: aliases(body.aliases),
      parentId: body.parentId ? (String(body.parentId) as EntityId) : null,
      category: String(body.category || 'engineering_practice'),
      skillType: String(body.skillType || 'technical'),
      visibility: body.visibility === 'public' ? 'public' : 'private',
      lifecycleState: ['draft', 'active', 'deprecated', 'archived'].includes(
        String(body.lifecycleState),
      )
        ? (body.lifecycleState as 'draft' | 'active' | 'deprecated' | 'archived')
        : 'active',
      externalIdentifier: body.externalIdentifier ? String(body.externalIdentifier) : null,
      provenanceMetadata: body.provenanceMetadata ? String(body.provenanceMetadata) : '{}',
    });
    return c.json({ data: skill, message: 'Skill created.', requestId: c.get('requestId') }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE'))
      return c.json({ code: 'SLUG_CONFLICT', message: 'That skill slug already exists.' }, 409);
    throw error;
  }
});

skillRoutes.post('/detect', async (c) => {
  const ownerId = owner(c);
  const [skillRows, contentRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, name, aliases FROM skills WHERE owner_id = ? AND archived_at IS NULL`,
    )
      .bind(ownerId)
      .all<{ id: string; name: string; aliases: string }>(),
    c.env.DB.prepare(
      `SELECT ci.id, ci.title, ci.summary, cr.body_snapshot
       FROM content_items ci JOIN content_revisions cr ON cr.content_item_id = ci.id
       WHERE ci.owner_id = ? AND ci.deleted_at IS NULL AND ci.archived_at IS NULL
         AND cr.revision_no = (SELECT MAX(r.revision_no) FROM content_revisions r WHERE r.content_item_id = ci.id)`,
    )
      .bind(ownerId)
      .all<{ id: string; title: string; summary: string | null; body_snapshot: string }>(),
  ]);
  const statements: D1PreparedStatement[] = [];
  const now = new Date().toISOString();
  for (const content of contentRows.results ?? []) {
    const haystack =
      `${content.title} ${content.summary ?? ''} ${content.body_snapshot}`.toLowerCase();
    for (const skill of skillRows.results ?? []) {
      let parsedAliases: string[] = [];
      try {
        parsedAliases = JSON.parse(skill.aliases || '[]') as string[];
      } catch {
        parsedAliases = [];
      }
      const names = [skill.name, ...parsedAliases]
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length >= 2);
      if (!names.some((name) => haystack.includes(name))) continue;
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO content_skills(content_item_id, skill_id, created_at)
         VALUES (?, ?, ?) ON CONFLICT(content_item_id, skill_id) DO NOTHING`,
        ).bind(content.id, skill.id, now),
      );
    }
  }
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({
    detectedMatches: statements.length,
    message: statements.length
      ? 'Journal skill connections were detected and synchronized.'
      : 'No new exact skill mentions were found.',
    requestId: c.get('requestId'),
  });
});

skillRoutes.put('/:id', async (c) => {
  const ownerId = owner(c);
  const id = c.req.param('id') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (!name || !slug || !Number.isInteger(Number(body.versionNo)))
    return c.json(
      { code: 'VALIDATION_ERROR', message: 'Name, slug, and version are required.' },
      400,
    );
  try {
    const data = await new D1SkillRepository(c.env.DB).updateSkill(ownerId, id, {
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      aliases: aliases(body.aliases),
      parentId: body.parentId ? (String(body.parentId) as EntityId) : null,
      category: String(body.category || 'engineering_practice'),
      skillType: String(body.skillType || 'technical'),
      visibility: ['private', 'restricted', 'unlisted', 'public'].includes(String(body.visibility))
        ? (body.visibility as 'private' | 'restricted' | 'unlisted' | 'public')
        : 'private',
      lifecycleState: ['draft', 'active', 'deprecated', 'archived'].includes(
        String(body.lifecycleState),
      )
        ? (body.lifecycleState as 'draft' | 'active' | 'deprecated' | 'archived')
        : 'active',
      firstObservedAt: body.firstObservedAt ? (String(body.firstObservedAt) as ISODateTime) : null,
      lastDemonstratedAt: body.lastDemonstratedAt
        ? (String(body.lastDemonstratedAt) as ISODateTime)
        : null,
      ownerConfirmed: body.ownerConfirmed !== false,
      externalIdentifier: body.externalIdentifier ? String(body.externalIdentifier) : null,
      provenanceMetadata: body.provenanceMetadata ? String(body.provenanceMetadata) : '{}',
      versionNo: Number(body.versionNo),
    });
    return c.json({ data, message: 'Skill saved.', requestId: c.get('requestId') });
  } catch (error) {
    if (error instanceof Error && error.message.includes('CONCURRENCY'))
      return c.json({ code: 'CONCURRENCY_CONFLICT', message: 'Reload and try again.' }, 409);
    if (error instanceof Error && error.message.includes('UNIQUE'))
      return c.json({ code: 'SLUG_CONFLICT', message: 'That slug already exists.' }, 409);
    throw error;
  }
});

skillRoutes.post('/:id/connections', async (c) => {
  const ownerId = owner(c);
  const skillId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const targetType = String(body.targetType || '');
  const targetId = String(body.targetId || '');
  const relationshipType = String(body.relationshipType || 'related');
  const relevance = Math.min(Math.max(Number(body.relevance || 3), 1), 5);
  const ownerNote = body.ownerNote ? String(body.ownerNote) : null;
  const evidenceProvenance = body.evidenceProvenance ? String(body.evidenceProvenance) : '{}';
  if (!targetId || !['skill', 'capability', 'evidence', 'project', 'journal'].includes(targetType))
    return c.json({ code: 'VALIDATION_ERROR', message: 'Choose a valid connected record.' }, 400);
  const now = new Date().toISOString();
  const linkId = crypto.randomUUID();
  const table =
    targetType === 'skill'
      ? 'skills'
      : targetType === 'capability'
        ? 'capabilities'
        : targetType === 'evidence'
          ? 'evidence_items'
          : targetType === 'project'
            ? 'projects'
            : 'content_items';
  const ownedTarget = await c.env.DB.prepare(
    `SELECT id FROM ${table} WHERE id = ? AND owner_id = ?`,
  )
    .bind(targetId, ownerId)
    .first();
  if (!ownedTarget)
    return c.json({ code: 'NOT_FOUND', message: 'Connected record was not found.' }, 404);
  try {
    if (targetType === 'skill') {
      if (targetId === skillId)
        return c.json(
          { code: 'VALIDATION_ERROR', message: 'A skill cannot connect to itself.' },
          400,
        );
      await c.env.DB.prepare(
        `INSERT INTO skill_relationships (id, owner_id, source_skill_id, target_skill_id, relationship_type, relevance, ordering, evidence_provenance, created_by_classification, approval_state, owner_note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'owner', 'accepted', ?, ?)`,
      )
        .bind(
          linkId,
          ownerId,
          skillId,
          targetId,
          relationshipType,
          relevance,
          evidenceProvenance,
          ownerNote,
          now,
        )
        .run();
    } else if (targetType === 'capability') {
      await c.env.DB.prepare(
        `INSERT INTO capability_skill_relationships (id, owner_id, capability_id, skill_id, relationship_type, relevance, ordering, evidence_provenance, created_by_classification, approval_state, owner_note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'owner', 'accepted', ?, ?)`,
      )
        .bind(
          linkId,
          ownerId,
          targetId,
          skillId,
          relationshipType,
          relevance,
          evidenceProvenance,
          ownerNote,
          now,
        )
        .run();
    } else if (targetType === 'evidence') {
      await c.env.DB.prepare(
        `INSERT INTO evidence_skill_links (id, owner_id, evidence_id, skill_id, relationship_type, relevance, ordering, evidence_provenance, created_by_classification, approval_state, owner_note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'owner', 'accepted', ?, ?)`,
      )
        .bind(
          linkId,
          ownerId,
          targetId,
          skillId,
          relationshipType,
          relevance,
          evidenceProvenance,
          ownerNote,
          now,
        )
        .run();
    } else if (targetType === 'project') {
      await c.env.DB.prepare(
        `INSERT INTO project_skills(project_id, skill_id, created_at) VALUES (?, ?, ?) ON CONFLICT(project_id, skill_id) DO NOTHING`,
      )
        .bind(targetId, skillId, now)
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO content_skills(content_item_id, skill_id, created_at) VALUES (?, ?, ?) ON CONFLICT(content_item_id, skill_id) DO NOTHING`,
      )
        .bind(targetId, skillId, now)
        .run();
    }
    return c.json({ message: 'Connection added.', requestId: c.get('requestId') }, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('CHECK') || error.message.includes('UNIQUE'))
    )
      return c.json(
        {
          code: 'INVALID_CONNECTION',
          message: 'That connection already exists or its type is invalid.',
        },
        409,
      );
    throw error;
  }
});

skillRoutes.delete('/:id/connections/:targetType/:targetId', async (c) => {
  const ownerId = owner(c);
  const skillId = c.req.param('id');
  const targetType = c.req.param('targetType');
  const targetId = c.req.param('targetId');
  const now = new Date().toISOString();
  if (targetType === 'skill')
    await c.env.DB.prepare(
      `UPDATE skill_relationships SET archived_at = ? WHERE owner_id = ? AND archived_at IS NULL AND ((source_skill_id = ? AND target_skill_id = ?) OR (source_skill_id = ? AND target_skill_id = ?))`,
    )
      .bind(now, ownerId, skillId, targetId, targetId, skillId)
      .run();
  else if (targetType === 'capability')
    await c.env.DB.prepare(
      `UPDATE capability_skill_relationships SET archived_at = ? WHERE owner_id = ? AND skill_id = ? AND capability_id = ? AND archived_at IS NULL`,
    )
      .bind(now, ownerId, skillId, targetId)
      .run();
  else if (targetType === 'evidence')
    await c.env.DB.prepare(
      `UPDATE evidence_skill_links SET archived_at = ? WHERE owner_id = ? AND skill_id = ? AND evidence_id = ? AND archived_at IS NULL`,
    )
      .bind(now, ownerId, skillId, targetId)
      .run();
  else if (targetType === 'project')
    await c.env.DB.prepare(`DELETE FROM project_skills WHERE project_id = ? AND skill_id = ?`)
      .bind(targetId, skillId)
      .run();
  else if (targetType === 'journal')
    await c.env.DB.prepare(`DELETE FROM content_skills WHERE content_item_id = ? AND skill_id = ?`)
      .bind(targetId, skillId)
      .run();
  else return c.json({ code: 'VALIDATION_ERROR', message: 'Invalid connection type.' }, 400);
  return c.json({ message: 'Connection removed.', requestId: c.get('requestId') });
});

skillRoutes.post('/:id/progression', async (c) => {
  const ownerId = owner(c);
  const skillId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const stages: ProgressionStage[] = [
    'exploring',
    'practicing',
    'applying',
    'demonstrated',
    'sustained',
    'leadership',
  ];
  const newStage = String(body.newStage) as ProgressionStage;
  const reason = String(body.reason || '').trim();
  if (!stages.includes(newStage) || !reason)
    return c.json({ code: 'VALIDATION_ERROR', message: 'Stage and reason are required.' }, 400);
  const previous = await c.env.DB.prepare(
    `SELECT new_stage FROM progression_events WHERE owner_id = ? AND skill_id = ? AND approval_state = 'accepted' ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(ownerId, skillId)
    .first<{ new_stage: string }>();
  await c.env.DB.prepare(
    `INSERT INTO progression_events(id, owner_id, skill_id, capability_id, previous_stage, new_stage, supporting_evidence_ids, reason, actor_classification, approval_state, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'owner', 'accepted', ?)`,
  )
    .bind(
      crypto.randomUUID(),
      ownerId,
      skillId,
      previous?.new_stage || null,
      newStage,
      JSON.stringify(Array.isArray(body.supportingEvidenceIds) ? body.supportingEvidenceIds : []),
      reason,
      new Date().toISOString(),
    )
    .run();
  return c.json({ message: 'Progression event recorded.', requestId: c.get('requestId') }, 201);
});

skillRoutes.get('/:id', async (c) => {
  const data = await getSkillProjection(c.env.DB, owner(c), { id: c.req.param('id') }, false);
  if (!data) return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Skill not found.' }, 404);
  return c.json({ data, requestId: c.get('requestId') });
});
