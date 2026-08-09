export type ContentState =
  'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'unlisted' | 'archived';

const ALLOWED_TRANSITIONS: Record<ContentState, ContentState[]> = {
  draft: ['review', 'archived'],
  review: ['approved', 'draft', 'archived'],
  approved: ['scheduled', 'published', 'unlisted', 'draft', 'archived'],
  scheduled: ['published', 'draft', 'archived'],
  published: ['unlisted', 'draft', 'archived'],
  unlisted: ['published', 'draft', 'archived'],
  archived: ['draft'],
};

export interface StateTransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a content item state transition is allowed.
 * Requirement 3 & Requirement 4.
 */
export function validateStateTransition(
  currentState: ContentState,
  targetState: ContentState,
): StateTransitionResult {
  if (currentState === targetState) {
    return { valid: true };
  }

  const allowed = ALLOWED_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      valid: false,
      reason: `Invalid state transition from "${currentState}" to "${targetState}". Allowed target states: ${allowed.join(', ')}.`,
    };
  }

  return { valid: true };
}
