import { describe, it, expect } from 'vitest';
import {
  isPubliclyDiscoverable,
  resolveEffectiveVisibility,
  validateClaimIntegrity,
  validateEvidenceLinkHasSingleTarget,
  assertNoNumericProficiency,
} from './value-objects/index.js';
import {
  DEFAULT_VISIBILITY,
  DEFAULT_PUBLICATION_STATE,
  isValidProposalTransition,
  VALID_CLAIM_SUPPORT_VERIFICATION_STATES,
} from './rules/index.js';
import { V1_DEFAULT_FLAGS } from './flags/index.js';

// ---------------------------------------------------------------------------
// Invariant: New records default to private
// ---------------------------------------------------------------------------
describe('DEFAULT_VISIBILITY invariant', () => {
  it('defaults to private', () => {
    expect(DEFAULT_VISIBILITY).toBe('private');
  });

  it('defaults to draft publication state', () => {
    expect(DEFAULT_PUBLICATION_STATE).toBe('draft');
  });
});

// ---------------------------------------------------------------------------
// Invariant: isPubliclyDiscoverable — ALL conditions must be met
// ---------------------------------------------------------------------------
describe('isPubliclyDiscoverable', () => {
  it('returns true only when public + published + not archived + no active embargo', () => {
    expect(isPubliclyDiscoverable('public', 'published', null, null)).toBe(true);
  });

  it('returns false when visibility is not public', () => {
    expect(isPubliclyDiscoverable('private', 'published', null, null)).toBe(false);
    expect(isPubliclyDiscoverable('restricted', 'published', null, null)).toBe(false);
    expect(isPubliclyDiscoverable('unlisted', 'published', null, null)).toBe(false);
  });

  it('returns false when not published', () => {
    expect(isPubliclyDiscoverable('public', 'draft', null, null)).toBe(false);
    expect(isPubliclyDiscoverable('public', 'approved', null, null)).toBe(false);
    expect(isPubliclyDiscoverable('public', 'archived', null, null)).toBe(false);
  });

  it('returns false when archived', () => {
    expect(isPubliclyDiscoverable('public', 'published', '2024-01-01T00:00:00Z', null)).toBe(false);
  });

  it('returns false when embargo is active', () => {
    const futureEmbargo = new Date(Date.now() + 86_400_000).toISOString();
    expect(isPubliclyDiscoverable('public', 'published', null, futureEmbargo)).toBe(false);
  });

  it('returns true when embargo has expired', () => {
    const pastEmbargo = new Date(Date.now() - 86_400_000).toISOString();
    expect(isPubliclyDiscoverable('public', 'published', null, pastEmbargo)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invariant: Effective visibility is most restrictive
// ---------------------------------------------------------------------------
describe('resolveEffectiveVisibility', () => {
  it('picks the most restrictive visibility', () => {
    expect(resolveEffectiveVisibility('public', 'private')).toBe('private');
    expect(resolveEffectiveVisibility('public', 'restricted', 'unlisted')).toBe('restricted');
    expect(resolveEffectiveVisibility('public', 'public')).toBe('public');
  });
});

// ---------------------------------------------------------------------------
// Invariant: Claim integrity — Section 11
// ---------------------------------------------------------------------------
describe('validateClaimIntegrity', () => {
  const validBaseCtx = {
    hasApprovedEvidenceEdge: true,
    evidenceVerificationState: 'owner_verified' as const,
    evidenceIsArchived: false,
    evidenceIsDisputed: false,
    evidenceIsBroken: false,
    visibilityPermitsIntendedSurface: true,
    ownerApprovedExactWording: true,
    isBackgroundStatementException: false,
    backgroundExceptionCoversCredentialsOrQuantifiedOutcome: false,
  };

  it('passes a valid claim', () => {
    expect(validateClaimIntegrity(validBaseCtx)).toEqual({ valid: true });
  });

  it('fails when no approved evidence edge', () => {
    const result = validateClaimIntegrity({ ...validBaseCtx, hasApprovedEvidenceEdge: false });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.some((r) => r.includes('no approved supporting evidence'))).toBe(true);
    }
  });

  it('fails when evidence is archived', () => {
    const result = validateClaimIntegrity({ ...validBaseCtx, evidenceIsArchived: true });
    expect(result.valid).toBe(false);
  });

  it('fails when evidence is disputed', () => {
    const result = validateClaimIntegrity({ ...validBaseCtx, evidenceIsDisputed: true });
    expect(result.valid).toBe(false);
  });

  it('fails when evidence is broken', () => {
    const result = validateClaimIntegrity({ ...validBaseCtx, evidenceIsBroken: true });
    expect(result.valid).toBe(false);
  });

  it('fails when owner has not approved the exact wording', () => {
    const result = validateClaimIntegrity({ ...validBaseCtx, ownerApprovedExactWording: false });
    expect(result.valid).toBe(false);
  });

  it('fails when background exception covers credentials', () => {
    const result = validateClaimIntegrity({
      ...validBaseCtx,
      isBackgroundStatementException: true,
      hasApprovedEvidenceEdge: false, // background statements don't need evidence
      backgroundExceptionCoversCredentialsOrQuantifiedOutcome: true,
    });
    expect(result.valid).toBe(false);
  });

  it('passes a valid background statement exception', () => {
    const result = validateClaimIntegrity({
      ...validBaseCtx,
      isBackgroundStatementException: true,
      hasApprovedEvidenceEdge: false,
      backgroundExceptionCoversCredentialsOrQuantifiedOutcome: false,
    });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invariant: Evidence links have exactly one target — Section 9
// ---------------------------------------------------------------------------
describe('validateEvidenceLinkHasSingleTarget', () => {
  const emptyId = null;
  const someId = '00000000-0000-0000-0000-000000000001' as import('../entities/index.js').EntityId;

  it('passes when exactly one target is set', () => {
    expect(
      validateEvidenceLinkHasSingleTarget({
        capabilityId: someId,
        claimId: emptyId,
        projectId: emptyId,
        contentItemId: emptyId,
        artifactId: emptyId,
      }),
    ).toEqual({ valid: true });
  });

  it('fails when no target is set', () => {
    const result = validateEvidenceLinkHasSingleTarget({
      capabilityId: null,
      claimId: null,
      projectId: null,
      contentItemId: null,
      artifactId: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('exactly one target');
    }
  });

  it('fails when multiple targets are set', () => {
    const result = validateEvidenceLinkHasSingleTarget({
      capabilityId: someId,
      claimId: someId,
      projectId: null,
      contentItemId: null,
      artifactId: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('2 provided');
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant: No numeric proficiency field
// ---------------------------------------------------------------------------
describe('assertNoNumericProficiency', () => {
  it('does not throw for safe objects', () => {
    expect(() =>
      assertNoNumericProficiency({ name: 'TypeScript', maturity: 'applying' }),
    ).not.toThrow();
  });

  it('throws for "proficiency" field', () => {
    expect(() => assertNoNumericProficiency({ proficiency: 85 })).toThrow('INVARIANT VIOLATION');
  });

  it('throws for "proficiency_percent" field', () => {
    expect(() => assertNoNumericProficiency({ proficiency_percent: 0.85 })).toThrow(
      'INVARIANT VIOLATION',
    );
  });

  it('throws for "score" field', () => {
    expect(() => assertNoNumericProficiency({ score: 9 })).toThrow('INVARIANT VIOLATION');
  });
});

// ---------------------------------------------------------------------------
// Invariant: AI cannot self-approve proposals
// ---------------------------------------------------------------------------
describe('isValidProposalTransition', () => {
  it('allows pending -> under_review', () => {
    expect(isValidProposalTransition('pending', 'under_review')).toBe(true);
  });

  it('allows under_review -> approved (by owner, not AI)', () => {
    expect(isValidProposalTransition('under_review', 'approved')).toBe(true);
  });

  it('does not allow pending -> approved (no skipping review)', () => {
    expect(isValidProposalTransition('pending', 'approved')).toBe(false);
  });

  it('does not allow approved -> pending (no rollback to pending)', () => {
    expect(isValidProposalTransition('approved', 'pending')).toBe(false);
  });

  it('does not allow rejected -> approved', () => {
    expect(isValidProposalTransition('rejected', 'approved')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invariant: Valid claim support verification states
// ---------------------------------------------------------------------------
describe('VALID_CLAIM_SUPPORT_VERIFICATION_STATES', () => {
  it('includes owner_verified and source_verified only', () => {
    expect(VALID_CLAIM_SUPPORT_VERIFICATION_STATES).toContain('owner_verified');
    expect(VALID_CLAIM_SUPPORT_VERIFICATION_STATES).toContain('source_verified');
    expect(VALID_CLAIM_SUPPORT_VERIFICATION_STATES).not.toContain('unreviewed');
    expect(VALID_CLAIM_SUPPORT_VERIFICATION_STATES).not.toContain('stale');
  });
});

// ---------------------------------------------------------------------------
// V1 feature flags — all V2+ flags must be false
// ---------------------------------------------------------------------------
describe('V1_DEFAULT_FLAGS', () => {
  it('has manualGitHubLinks enabled in V1', () => {
    expect(V1_DEFAULT_FLAGS.manualGitHubLinks).toBe(true);
  });

  it('has all V2+ flags disabled', () => {
    const v2PlusFlags: Array<keyof typeof V1_DEFAULT_FLAGS> = [
      'githubConnection',
      'githubWebhookIngestion',
      'aiMetadataProposals',
      'capabilityAssessmentProposals',
      'resumeGeneration',
      'jobParsing',
      'careerMatching',
      'semanticIndexing',
      'privateAskMyPortfolio',
      'publicAskMyPortfolio',
      'knowledgeGraph',
    ];
    for (const flag of v2PlusFlags) {
      expect(V1_DEFAULT_FLAGS[flag], `${flag} should be false in V1`).toBe(false);
    }
  });
});
