/**
 * Domain business rules.
 *
 * These rules implement the invariants from the approved documents.
 * They are pure functions with no side effects and no external dependencies.
 */

import type { Visibility, PublicationState } from '../entities/index.js';

// ---------------------------------------------------------------------------
// Default visibility rule — Section 4 of Database Model
// INVARIANT: Imported, generated and newly created records default to private.
// ---------------------------------------------------------------------------

/** All new records must start as private. */
export const DEFAULT_VISIBILITY: Visibility = 'private';
export const DEFAULT_PUBLICATION_STATE: PublicationState = 'draft';

// ---------------------------------------------------------------------------
// AI proposal rule — Master Prompt §35
// INVARIANT: AI may propose but cannot invent, approve or publish professional facts.
// ---------------------------------------------------------------------------

/** Allowed AI proposal state transitions. AI cannot self-approve. */
export const AI_ALLOWED_PROPOSAL_TRANSITIONS = {
  pending: ['under_review', 'rejected', 'expired'],
  under_review: ['approved', 'rejected', 'superseded'],
  approved: ['superseded'],
  rejected: [],
  superseded: [],
  expired: [],
} as const satisfies Record<string, readonly string[]>;

/**
 * Validates that an AI proposal state transition is legal.
 * INVARIANT: AI system cannot approve its own proposals.
 */
export function isValidProposalTransition(
  from: keyof typeof AI_ALLOWED_PROPOSAL_TRANSITIONS,
  to: string,
): boolean {
  const allowed = AI_ALLOWED_PROPOSAL_TRANSITIONS[from];
  return (allowed as readonly string[]).includes(to);
}

// ---------------------------------------------------------------------------
// Publication rules — Section 6 of Rendering Architecture
// ---------------------------------------------------------------------------

/** States from which a record can be published. */
export const PUBLISHABLE_STATES: readonly PublicationState[] = ['approved', 'scheduled'];

/** Determines if a publication state allows transition to published. */
export function canTransitionToPublished(state: PublicationState): boolean {
  return PUBLISHABLE_STATES.includes(state);
}

/** Determines if a record in this state should have a public projection. */
export function hasPublicProjection(state: PublicationState): boolean {
  return state === 'published';
}

// ---------------------------------------------------------------------------
// Evidence verification rules — Section 8 of Database Model
// ---------------------------------------------------------------------------

/** States that allow a claim to reference the evidence as valid support. */
export const VALID_CLAIM_SUPPORT_VERIFICATION_STATES = [
  'owner_verified',
  'source_verified',
] as const;

export type ValidClaimSupportVerificationState =
  (typeof VALID_CLAIM_SUPPORT_VERIFICATION_STATES)[number];

/** Verification states that mark evidence as unhealthy for claim support. */
export const UNHEALTHY_EVIDENCE_STATES = ['broken', 'disputed', 'archived'] as const;

export type UnhealthyEvidenceState = (typeof UNHEALTHY_EVIDENCE_STATES)[number];
