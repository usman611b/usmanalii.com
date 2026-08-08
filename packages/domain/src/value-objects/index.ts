/**
 * Domain value objects and validation rules.
 *
 * All validation is pure TypeScript — no runtime dependencies outside this package.
 */

import type { EntityId, ISODate, ISODateTime, Visibility, PublicationState } from '../entities/index.js';

// ---------------------------------------------------------------------------
// Visibility rules — Section 7 of Database Model
// ---------------------------------------------------------------------------

/**
 * Determines if a record is publicly discoverable.
 * ALL conditions must be met — the most restrictive policy wins.
 *
 * @param visibility - effective visibility of the record
 * @param state - publication state of the record
 * @param archivedAt - whether the record is archived
 * @param embargoUntil - optional embargo expiry
 * @param now - current UTC time (injectable for testing)
 */
export function isPubliclyDiscoverable(
  visibility: Visibility,
  state: PublicationState,
  archivedAt: ISODateTime | null,
  embargoUntil: ISODateTime | null,
  now: Date = new Date(),
): boolean {
  if (visibility !== 'public') return false;
  if (state !== 'published') return false;
  if (archivedAt !== null) return false;
  if (embargoUntil !== null && new Date(embargoUntil) > now) return false;
  return true;
}

/**
 * Resolves the effective visibility as the most restrictive among
 * a record and its parent chain.
 */
export function resolveEffectiveVisibility(
  ...visibilities: readonly Visibility[]
): Visibility {
  const order: Record<Visibility, number> = {
    private: 0,
    restricted: 1,
    unlisted: 2,
    public: 3,
  };
  return visibilities.reduce((most, current) =>
    order[current] < order[most] ? current : most,
  );
}

// ---------------------------------------------------------------------------
// Claim integrity — Section 11 of Database Model
// INVARIANT: A claim cannot become approved/published unless all conditions pass.
// ---------------------------------------------------------------------------

export interface ClaimIntegrityContext {
  readonly hasApprovedEvidenceEdge: boolean;
  readonly evidenceVerificationState: 'owner_verified' | 'source_verified' | 'other';
  readonly evidenceIsArchived: boolean;
  readonly evidenceIsDisputed: boolean;
  readonly evidenceIsBroken: boolean;
  readonly visibilityPermitsIntendedSurface: boolean;
  readonly ownerApprovedExactWording: boolean;
  readonly isBackgroundStatementException: boolean;
  readonly backgroundExceptionCoversCredentialsOrQuantifiedOutcome: boolean;
}

export type ClaimIntegrityResult =
  | { valid: true }
  | { valid: false; reasons: readonly string[] };

/**
 * Validates claim integrity before approval or publication.
 * Section 11 of Database Model.
 */
export function validateClaimIntegrity(ctx: ClaimIntegrityContext): ClaimIntegrityResult {
  const reasons: string[] = [];

  if (!ctx.ownerApprovedExactWording) {
    reasons.push('Owner has not approved the exact wording.');
  }

  if (!ctx.isBackgroundStatementException) {
    // Standard claim — must have approved evidence
    if (!ctx.hasApprovedEvidenceEdge) {
      reasons.push('Claim has no approved supporting evidence edge.');
    }
    if (ctx.evidenceVerificationState === 'other') {
      reasons.push('Supporting evidence must be owner_verified or source_verified.');
    }
    if (ctx.evidenceIsArchived) {
      reasons.push('Supporting evidence is archived.');
    }
    if (ctx.evidenceIsDisputed) {
      reasons.push('Supporting evidence is disputed.');
    }
    if (ctx.evidenceIsBroken) {
      reasons.push('Supporting evidence source is broken.');
    }
  } else {
    // Background statement exception
    if (ctx.backgroundExceptionCoversCredentialsOrQuantifiedOutcome) {
      reasons.push(
        'Background statement exception cannot cover credentials, employment, quantified outcomes or delivered work.',
      );
    }
  }

  if (!ctx.visibilityPermitsIntendedSurface) {
    reasons.push('Visibility does not permit the intended publication surface.');
  }

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Evidence link validation — Section 9 of Database Model
// INVARIANT: Every edge references one evidence item and EXACTLY ONE target.
// ---------------------------------------------------------------------------

/**
 * Validates that an evidence link has exactly one target.
 * This is enforced both at the database level (DB constraints) and here.
 */
export function validateEvidenceLinkHasSingleTarget(targetFields: {
  capabilityId: EntityId | null;
  claimId: EntityId | null;
  projectId: EntityId | null;
  contentItemId: EntityId | null;
  artifactId: EntityId | null;
}): { valid: true } | { valid: false; reason: string } {
  const filledTargets = Object.values(targetFields).filter((v) => v !== null).length;
  if (filledTargets === 0) {
    return { valid: false, reason: 'Evidence link must reference exactly one target (none provided).' };
  }
  if (filledTargets > 1) {
    return {
      valid: false,
      reason: `Evidence link must reference exactly one target (${filledTargets} provided).`,
    };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Capability maturity invariant
// INVARIANT: Maturity must never be represented as a percentage.
// ---------------------------------------------------------------------------

/**
 * Type guard ensuring no numeric proficiency is used.
 * This is a compile-time and runtime double-check.
 */
export function assertNoNumericProficiency(
  obj: Record<string, unknown>,
): void {
  const forbidden = [
    'proficiency',
    'proficiency_level',
    'proficiency_percent',
    'skill_level',
    'skill_percent',
    'skill_score',
    'percent',
    'score',
  ];
  for (const key of forbidden) {
    if (key in obj) {
      throw new Error(
        `INVARIANT VIOLATION: Field "${key}" is not permitted. Skills and capabilities must not contain numeric proficiency.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// ID utilities
// ---------------------------------------------------------------------------

/** Creates a branded EntityId — only the Worker may call this. */
export function createEntityId(raw: string): EntityId {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    throw new Error(`Invalid EntityId format: ${raw}`);
  }
  return raw as EntityId;
}

/** Creates a branded ISODateTime — validates ISO-8601 format. */
export function createISODateTime(raw: string): ISODateTime {
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid ISODateTime: ${raw}`);
  }
  return raw as ISODateTime;
}

/** Creates a branded ISODate. */
export function createISODate(raw: string): ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Invalid ISODate: ${raw}`);
  }
  return raw as ISODate;
}
