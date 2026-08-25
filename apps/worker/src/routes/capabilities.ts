import { Hono } from 'hono';
import { D1CapabilityRepository } from '@usmanalii/database';
import {
  validateCapabilityWording,
  type EntityId,
  type ISODateTime,
  type ProgressionStage,
} from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';
import { getCapabilityProjection } from './knowledge-projections.js';

export const capabilityRoutes = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
const owner = (context: { get(name: 'authContext'): AuthVariables['authContext'] }) =>
  (context.get('authContext')?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
const slugify = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const maturity = (value: unknown) => {
  const stages = [
    'exploring',
    'practicing',
    'applying',
    'demonstrated',
    'sustained',
    'leadership',
  ] as const;
  return stages.includes(value as (typeof stages)[number])
    ? (value as (typeof stages)[number])
    : 'exploring';
};

capabilityRoutes.get('/', async (c) => {
  const options: { state?: string; visibility?: string } = {};
  const state = c.req.query('state');
  const visibility = c.req.query('visibility');
  if (state) options.state = state;
  if (visibility) options.visibility = visibility;
  const capabilities = await new D1CapabilityRepository(c.env.DB).listCapabilitiesByOwner(
    owner(c),
    options,
  );
  return c.json({ data: capabilities, count: capabilities.length, requestId: c.get('requestId') });
});

capabilityRoutes.post('/', async (c) => {
  const ownerId = owner(c);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.owner_id || body.ownerId)
    return c.json({ code: 'VALIDATION_ERROR', message: 'owner_id cannot be supplied.' }, 400);
  const title = String(body.title || '').trim();
  const description = String(body.description || title).trim();
  const outcomeStatement = String(body.outcomeStatement || description).trim();
  const validation = validateCapabilityWording(title, outcomeStatement);
  if (!validation.valid)
    return c.json({ code: 'VALIDATION_ERROR', message: validation.reason }, 400);
  try {
    const data = await new D1CapabilityRepository(c.env.DB).createCapability({
      id: crypto.randomUUID() as EntityId,
      ownerId,
      title,
      description,
      outcomeStatement,
      slug: slugify(body.slug || title),
      maturity: maturity(body.maturity),
      maturityRationale: String(body.maturityRationale || 'Initial owner-authored assessment.'),
      qualifyingEvidenceRules: String(body.qualifyingEvidenceRules || '{}'),
      visibility: body.visibility === 'public' ? 'public' : 'private',
      state: [
        'draft',
        'review',
        'approved',
        'scheduled',
        'published',
        'unlisted',
        'archived',
      ].includes(String(body.state))
        ? (body.state as
            'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'unlisted' | 'archived')
        : 'draft',
      lifecycleState: ['draft', 'active', 'deprecated', 'archived'].includes(
        String(body.lifecycleState),
      )
        ? (body.lifecycleState as 'draft' | 'active' | 'deprecated' | 'archived')
        : 'active',
    });
    return c.json({ data, message: 'Capability created.', requestId: c.get('requestId') }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE'))
      return c.json(
        { code: 'SLUG_CONFLICT', message: 'That capability slug already exists.' },
        409,
      );
    throw error;
  }
});

capabilityRoutes.post('/detect', async (c) => {
  const ownerId = owner(c);
  const [capRows, contentRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, title FROM capabilities WHERE owner_id = ? AND archived_at IS NULL`,
    )
      .bind(ownerId)
      .all<{ id: string; title: string }>(),
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
    for (const cap of capRows.results ?? []) {
      const title = cap.title.trim().toLowerCase();
      if (title.length < 4 || !haystack.includes(title)) continue;
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO content_capabilities(content_item_id, capability_id, relationship_type, created_at)
         VALUES (?, ?, 'related', ?) ON CONFLICT(content_item_id, capability_id) DO NOTHING`,
        ).bind(content.id, cap.id, now),
      );
    }
  }
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({
    detectedMatches: statements.length,
    message: statements.length
      ? 'Journal capability connections were detected and synchronized.'
      : 'No new exact capability mentions were found.',
    requestId: c.get('requestId'),
  });
});

capabilityRoutes.put('/:id', async (c) => {
  const ownerId = owner(c);
  const id = c.req.param('id') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const outcomeStatement = String(body.outcomeStatement || '').trim();
  const validation = validateCapabilityWording(title, outcomeStatement);
  if (!validation.valid || !Number.isInteger(Number(body.versionNo)))
    return c.json(
      { code: 'VALIDATION_ERROR', message: validation.reason || 'Version is required.' },
      400,
    );
  try {
    const data = await new D1CapabilityRepository(c.env.DB).updateCapability(ownerId, id, {
      title,
      description,
      outcomeStatement,
      slug: slugify(body.slug || title),
      maturity: maturity(body.maturity),
      maturityRationale: String(body.maturityRationale || ''),
      qualifyingEvidenceRules: String(body.qualifyingEvidenceRules || '{}'),
      visibility: ['private', 'restricted', 'unlisted', 'public'].includes(String(body.visibility))
        ? (body.visibility as 'private' | 'restricted' | 'unlisted' | 'public')
        : 'private',
      state: [
        'draft',
        'review',
        'approved',
        'scheduled',
        'published',
        'unlisted',
        'archived',
      ].includes(String(body.state))
        ? (body.state as
            'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'unlisted' | 'archived')
        : 'draft',
      lifecycleState: ['draft', 'active', 'deprecated', 'archived'].includes(
        String(body.lifecycleState),
      )
        ? (body.lifecycleState as 'draft' | 'active' | 'deprecated' | 'archived')
        : 'active',
      ownerConfirmed: body.ownerConfirmed !== false,
      firstDemonstratedAt: body.firstDemonstratedAt
        ? (String(body.firstDemonstratedAt) as ISODateTime)
        : null,
      lastDemonstratedAt: body.lastDemonstratedAt
        ? (String(body.lastDemonstratedAt) as ISODateTime)
        : null,
      lastReviewedAt: body.lastReviewedAt ? String(body.lastReviewedAt) : null,
      provenanceMetadata: String(body.provenanceMetadata || '{}'),
      versionNo: Number(body.versionNo),
    });
    return c.json({ data, message: 'Capability saved.', requestId: c.get('requestId') });
  } catch (error) {
    if (error instanceof Error && error.message.includes('CONCURRENCY'))
      return c.json({ code: 'CONCURRENCY_CONFLICT', message: 'Reload and try again.' }, 409);
    if (error instanceof Error && error.message.includes('UNIQUE'))
      return c.json({ code: 'SLUG_CONFLICT', message: 'That slug already exists.' }, 409);
    throw error;
  }
});

capabilityRoutes.post('/:id/connections', async (c) => {
  const ownerId = owner(c);
  const capabilityId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const targetType = String(body.targetType || '');
  const targetId = String(body.targetId || '');
  const relationshipType = String(
    body.relationshipType || (targetType === 'skill' ? 'supporting' : 'demonstrates'),
  );
  const relevance = Math.min(Math.max(Number(body.relevance || 3), 1), 5);
  const ownerNote = body.ownerNote ? String(body.ownerNote) : null;
  if (!targetId || !['skill', 'evidence', 'project', 'journal'].includes(targetType))
    return c.json({ code: 'VALIDATION_ERROR', message: 'Choose a valid connected record.' }, 400);
  const table =
    targetType === 'skill'
      ? 'skills'
      : targetType === 'evidence'
        ? 'evidence_items'
        : targetType === 'project'
          ? 'projects'
          : 'content_items';
  const target = await c.env.DB.prepare(`SELECT id FROM ${table} WHERE id = ? AND owner_id = ?`)
    .bind(targetId, ownerId)
    .first();
  if (!target)
    return c.json({ code: 'NOT_FOUND', message: 'Connected record was not found.' }, 404);
  const now = new Date().toISOString();
  const linkId = crypto.randomUUID();
  try {
    if (targetType === 'skill')
      await c.env.DB.prepare(
        `INSERT INTO capability_skill_relationships(id, owner_id, capability_id, skill_id, relationship_type, relevance, ordering, evidence_provenance, created_by_classification, approval_state, owner_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, '{}', 'owner', 'accepted', ?, ?)`,
      )
        .bind(linkId, ownerId, capabilityId, targetId, relationshipType, relevance, ownerNote, now)
        .run();
    else if (targetType === 'evidence')
      await c.env.DB.prepare(
        `INSERT INTO evidence_capability_links(id, owner_id, evidence_id, capability_id, relationship_type, relevance, ordering, evidence_provenance, created_by_classification, approval_state, owner_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, '{}', 'owner', 'accepted', ?, ?)`,
      )
        .bind(linkId, ownerId, targetId, capabilityId, relationshipType, relevance, ownerNote, now)
        .run();
    else if (targetType === 'project')
      await c.env.DB.prepare(
        `INSERT INTO project_relationships(id, owner_id, source_id, source_type, target_id, target_type, relationship_type, relevance, display_order, provenance, created_by_classification, approval_state, owner_note, created_at)
       VALUES (?, ?, ?, 'project', ?, 'capability', ?, ?, 0, '{}', 'owner_manual', 'approved', ?, ?)`,
      )
        .bind(linkId, ownerId, targetId, capabilityId, relationshipType, relevance, ownerNote, now)
        .run();
    else
      await c.env.DB.prepare(
        `INSERT INTO content_capabilities(content_item_id, capability_id, relationship_type, created_at)
       VALUES (?, ?, ?, ?) ON CONFLICT(content_item_id, capability_id) DO UPDATE SET relationship_type = excluded.relationship_type`,
      )
        .bind(targetId, capabilityId, relationshipType, now)
        .run();
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

capabilityRoutes.delete('/:id/connections/:targetType/:targetId', async (c) => {
  const ownerId = owner(c);
  const capabilityId = c.req.param('id');
  const targetType = c.req.param('targetType');
  const targetId = c.req.param('targetId');
  const now = new Date().toISOString();
  if (targetType === 'skill')
    await c.env.DB.prepare(
      `UPDATE capability_skill_relationships SET archived_at = ? WHERE owner_id = ? AND capability_id = ? AND skill_id = ? AND archived_at IS NULL`,
    )
      .bind(now, ownerId, capabilityId, targetId)
      .run();
  else if (targetType === 'evidence')
    await c.env.DB.prepare(
      `UPDATE evidence_capability_links SET archived_at = ? WHERE owner_id = ? AND capability_id = ? AND evidence_id = ? AND archived_at IS NULL`,
    )
      .bind(now, ownerId, capabilityId, targetId)
      .run();
  else if (targetType === 'project')
    await c.env.DB.prepare(
      `UPDATE project_relationships SET archived_at = ? WHERE owner_id = ? AND source_id = ? AND source_type = 'project' AND target_id = ? AND target_type = 'capability' AND archived_at IS NULL`,
    )
      .bind(now, ownerId, targetId, capabilityId)
      .run();
  else if (targetType === 'journal')
    await c.env.DB.prepare(
      `DELETE FROM content_capabilities WHERE content_item_id = ? AND capability_id = ?`,
    )
      .bind(targetId, capabilityId)
      .run();
  else return c.json({ code: 'VALIDATION_ERROR', message: 'Invalid connection type.' }, 400);
  return c.json({ message: 'Connection removed.', requestId: c.get('requestId') });
});

capabilityRoutes.post('/:id/progression', async (c) => {
  const ownerId = owner(c);
  const capabilityId = c.req.param('id');
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
    `SELECT new_stage FROM progression_events WHERE owner_id = ? AND capability_id = ? AND approval_state = 'accepted' ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(ownerId, capabilityId)
    .first<{ new_stage: string }>();
  await c.env.DB.prepare(
    `INSERT INTO progression_events(id, owner_id, skill_id, capability_id, previous_stage, new_stage, supporting_evidence_ids, reason, actor_classification, approval_state, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'owner', 'accepted', ?)`,
  )
    .bind(
      crypto.randomUUID(),
      ownerId,
      capabilityId,
      previous?.new_stage || null,
      newStage,
      JSON.stringify(Array.isArray(body.supportingEvidenceIds) ? body.supportingEvidenceIds : []),
      reason,
      new Date().toISOString(),
    )
    .run();
  return c.json({ message: 'Progression event recorded.', requestId: c.get('requestId') }, 201);
});

capabilityRoutes.get('/:id', async (c) => {
  const data = await getCapabilityProjection(c.env.DB, owner(c), { id: c.req.param('id') }, false);
  if (!data) return c.json({ code: 'RESOURCE_NOT_FOUND', message: 'Capability not found.' }, 404);
  return c.json({ data, requestId: c.get('requestId') });
});
