import { Hono } from 'hono';
import { D1SuggestionRepository } from '@usmanalii/database';
import type { EntityId, SuggestionType, SuggestionOrigin } from '@usmanalii/domain';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const suggestionRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

/** GET /api/v1/private/suggestions — List pending owner suggestions */
suggestionRoutes.get('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const repo = new D1SuggestionRepository(c.env.DB);

  const suggestions = await repo.listPendingSuggestions(ownerId);
  return c.json({
    data: suggestions,
    count: suggestions.length,
    aiSuggestionsEnabled: false,
    requestId: c.get('requestId'),
  });
});

/** POST /api/v1/private/suggestions — Create proposal suggestion (requires evidence references & fingerprint) */
suggestionRoutes.post('/', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const suggestionType = String(body.suggestionType || 'possible_skill');
  const evidenceReferences = Array.isArray(body.evidenceReferences) ? body.evidenceReferences : [];

  if (!title || !description) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Title and description are required.', requestId: c.get('requestId') }, 400);
  }

  if (evidenceReferences.length === 0) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Suggestions require at least one valid evidence reference ID.', requestId: c.get('requestId') }, 400);
  }

  const fingerprint = String(body.fingerprint || `${suggestionType}:${title}`).toLowerCase().trim();
  const repo = new D1SuggestionRepository(c.env.DB);
  const id = crypto.randomUUID() as EntityId;

  const created = await repo.createSuggestion({
    id,
    ownerId,
    suggestionType: suggestionType as SuggestionType,
    title,
    description,
    payloadJson: JSON.stringify(body.payload || {}),
    evidenceReferences: evidenceReferences as EntityId[],
    createdByClassification: (body.createdByClassification as SuggestionOrigin) || 'deterministic_rule',
    modelMetadataJson: '{}',
    fingerprint,
  });

  if (!created) {
    return c.json({ code: 'SUGGESTION_DEDUPLICATED', message: 'An identical suggestion was previously rejected.', requestId: c.get('requestId') }, 200);
  }

  return c.json({ data: created, message: 'Suggestion created for owner review.', requestId: c.get('requestId') }, 201);
});

/** POST /api/v1/private/suggestions/:id/reject — Reject suggestion */
suggestionRoutes.post('/:id/reject', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const id = c.req.param('id') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = String(body.reason || 'Owner rejected proposal').trim();

  const repo = new D1SuggestionRepository(c.env.DB);
  const rejected = await repo.rejectSuggestion(ownerId, id, reason);

  return c.json({ data: rejected, message: 'Suggestion rejected and fingerprint recorded.', requestId: c.get('requestId') });
});

/** POST /api/v1/private/suggestions/:id/accept — Accept suggestion */
suggestionRoutes.post('/:id/accept', async (c) => {
  const authContext = c.get('authContext');
  const ownerId = (authContext?.ownerId || '00000000-0000-0000-0000-000000000001') as EntityId;
  const id = c.req.param('id') as EntityId;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const edited = Boolean(body.wasEdited);
  const repo = new D1SuggestionRepository(c.env.DB);

  const accepted = await repo.acceptSuggestionAtomic(
    ownerId,
    id,
    edited ? 'edited_and_accepted' : 'accepted',
    [],
  );

  return c.json({ data: accepted, message: 'Suggestion accepted by owner.', requestId: c.get('requestId') });
});
