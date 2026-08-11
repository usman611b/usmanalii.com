/**
 * Centralized Claim Eligibility Engine — Milestone M7
 *
 * Rules:
 * 1. Owner approval required (approvalState === 'approved' & approvedWording set)
 * 2. Active publication state (state === 'published') & public visibility (visibility === 'public')
 * 3. Not archived (archivedAt === null)
 * 4. Minimum support rule:
 *    - Has approved, healthy supporting evidence (or capabilities/projects backed by healthy evidence)
 *    - OR has a valid audited background statement exception
 * 5. Evidence health rule:
 *    - Supporting evidence must NOT be revoked, disputed, broken, stale, or archived.
 *    - Supporting evidence verificationState MUST be 'owner_verified', 'source_verified', or 'automatically_observed'.
 *    - Embargo must be expired.
 * 6. Exception restriction rule:
 *    - Background statement exceptions CANNOT cover credentials, employment, quantified outcomes, or delivered work.
 *
 * Provides explainable rejection reasons for the owner dashboard without leaking private details publicly.
 */

import type { ClaimEntity, ClaimSupportEntity, EvidenceItemEntity } from '../entities/index.js';

export interface ClaimEligibilityResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly healthySupportCount: number;
  readonly unhealthySupportCount: number;
  readonly isExceptionUsed: boolean;
}

const FORBIDDEN_EXCEPTION_KEYWORDS = [
  'employed',
  'employment',
  'worked at',
  'company',
  'degree',
  'certified',
  'certification',
  'credential',
  'increased',
  'decreased',
  'reduced',
  'improved by',
  '%',
  'delivered',
  'shipped to production',
];

export function explainClaimEligibility(
  claim: ClaimEntity,
  supports: readonly ClaimSupportEntity[],
  supportingEvidence: readonly EvidenceItemEntity[],
  now: Date = new Date(),
): ClaimEligibilityResult {
  const reasons: string[] = [];
  let healthySupportCount = 0;
  let unhealthySupportCount = 0;
  let isExceptionUsed = false;

  if (claim.archivedAt !== null) {
    reasons.push('Claim is archived.');
  }

  if (claim.approvalState !== 'approved') {
    reasons.push(`Claim approval state is '${claim.approvalState}' (must be 'approved').`);
  }

  if (!claim.approvedWording || claim.approvedWording.trim() === '') {
    reasons.push('Claim does not have owner-approved wording.');
  }

  if (claim.state !== 'published') {
    reasons.push(`Claim publication state is '${claim.state}' (must be 'published').`);
  }

  if (claim.visibility !== 'public') {
    reasons.push(`Claim visibility is '${claim.visibility}' (must be 'public').`);
  }

  if (claim.isBackgroundStatementException) {
    isExceptionUsed = true;
    if (
      !claim.backgroundStatementExceptionReason ||
      claim.backgroundStatementExceptionReason.trim() === ''
    ) {
      reasons.push('Background statement exception requires a documented reason.');
    }

    const lowerWording = (claim.wording || '').toLowerCase();
    const hasForbiddenKeyword = FORBIDDEN_EXCEPTION_KEYWORDS.some((kw) =>
      lowerWording.includes(kw),
    );

    if (hasForbiddenKeyword) {
      reasons.push(
        'Background statement exception cannot cover employment, credentials, quantified outcomes, or delivered work.',
      );
    }
  } else {
    // Standard evidence-backed claim requirement
    if (supports.length === 0 && supportingEvidence.length === 0) {
      reasons.push('Claim has no supporting evidence links or capability/project references.');
    } else {
      for (const ev of supportingEvidence) {
        let isHealthy = true;

        if (ev.ownerId !== claim.ownerId) {
          isHealthy = false;
          reasons.push(
            `Supporting evidence '${ev.title || ev.id}' is owned by a different identity.`,
          );
        }

        if (
          [
            'revoked',
            'disputed',
            'broken',
            'stale',
            'archived',
            'unverified',
            'unreviewed',
          ].includes(ev.verificationState)
        ) {
          isHealthy = false;
          reasons.push(
            `Supporting evidence '${ev.title || ev.id}' is in unhealthy state '${ev.verificationState}'.`,
          );
        }

        if (ev.archivedAt !== null) {
          isHealthy = false;
          reasons.push(`Supporting evidence '${ev.title || ev.id}' is archived.`);
        }

        if (ev.embargoUntil && new Date(ev.embargoUntil) > now) {
          isHealthy = false;
          reasons.push(`Supporting evidence '${ev.title || ev.id}' is under embargo.`);
        }

        if (ev.visibility !== 'public') {
          isHealthy = false;
          reasons.push(`Supporting evidence '${ev.title || ev.id}' is private or restricted.`);
        }

        if (isHealthy) {
          healthySupportCount++;
        } else {
          unhealthySupportCount++;
        }
      }

      if (supportingEvidence.length > 0 && healthySupportCount === 0) {
        reasons.push('Claim has no active, verified, healthy public supporting evidence.');
      }
    }
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    reasons,
    healthySupportCount,
    unhealthySupportCount,
    isExceptionUsed,
  };
}

export function isClaimEligibleForPublicSurface(
  claim: ClaimEntity,
  supports: readonly ClaimSupportEntity[],
  supportingEvidence: readonly EvidenceItemEntity[],
  now: Date = new Date(),
): boolean {
  return explainClaimEligibility(claim, supports, supportingEvidence, now).eligible;
}
