import { describe, expect, it } from 'vitest';
import type {
  ClaimEntity,
  ClaimSupportEntity,
  EvidenceItemEntity,
  EntityId,
  ISODateTime,
} from '../entities/index.js';
import {
  isClaimEligibleForPublicSurface,
  explainClaimEligibility,
} from './claim-eligibility-engine.js';

describe('Claim Eligibility Engine Matrix (M7 Gate 1)', () => {
  const ownerA = '00000000-0000-0000-0000-000000000001' as EntityId;
  const ownerB = '00000000-0000-0000-0000-000000000002' as EntityId;
  const claimId = '11111111-1111-1111-1111-111111111111' as EntityId;
  const evId = '22222222-2222-2222-2222-222222222222' as EntityId;

  const validClaim: ClaimEntity = {
    id: claimId,
    ownerId: ownerA,
    wording: 'Designed and deployed Cloudflare Worker REST API',
    audience: 'recruiter',
    context: 'Portfolio backend',
    approvalState: 'approved',
    approvedAt: '2026-08-01T00:00:00Z' as ISODateTime,
    approvedWording: 'Designed and deployed Cloudflare Worker REST API',
    reviewDate: null,
    isBackgroundStatementException: false,
    backgroundStatementExceptionReason: null,
    visibility: 'public',
    state: 'published',
    versionNo: 1,
    createdAt: '2026-08-01T00:00:00Z' as ISODateTime,
    updatedAt: '2026-08-01T00:00:00Z' as ISODateTime,
    archivedAt: null,
  };

  const healthyEvidence: EvidenceItemEntity = {
    id: evId,
    ownerId: ownerA,
    evidenceType: 'commit',
    sourceType: 'github',
    provider: 'github',
    externalId: 'sha-123',
    canonicalLocator: 'https://github.com/usman/repo/commit/sha-123',
    title: 'Initial API commit',
    description: null,
    providerCreatedAt: null,
    providerUpdatedAt: null,
    capturedAt: '2026-08-01T00:00:00Z' as ISODateTime,
    occurredAt: '2026-08-01T00:00:00Z' as ISODateTime,
    contentHash: null,
    authorshipNote: null,
    provenanceSnapshot: null,
    licenseMetadata: null,
    confidentialityMetadata: null,
    verificationState: 'owner_verified',
    verificationMethod: 'manual',
    verifiedBy: ownerA,
    verifiedAt: '2026-08-01T00:00:00Z' as ISODateTime,
    qualitySignals: null,
    visibility: 'public',
    embargoUntil: null,
    versionNo: 1,
    createdAt: '2026-08-01T00:00:00Z' as ISODateTime,
    updatedAt: '2026-08-01T00:00:00Z' as ISODateTime,
    archivedAt: null,
  };

  const supportLink: ClaimSupportEntity = {
    id: '33333333-3333-3333-3333-333333333333' as EntityId,
    claimId,
    ownerId: ownerA,
    targetType: 'evidence',
    targetId: evId,
    createdAt: '2026-08-01T00:00:00Z' as ISODateTime,
  };

  const testMatrix = [
    {
      name: 'Baseline valid claim with healthy owner-verified evidence',
      claimMod: {},
      evidenceMod: {},
      expected: true,
    },
    {
      name: 'Cross-owner evidence (owned by ownerB instead of ownerA)',
      claimMod: {},
      evidenceMod: { ownerId: ownerB },
      expected: false,
    },
    {
      name: 'Draft approval state',
      claimMod: { approvalState: 'draft' as const },
      evidenceMod: {},
      expected: false,
    },
    {
      name: 'Missing approved wording',
      claimMod: { approvedWording: null },
      evidenceMod: {},
      expected: false,
    },
    {
      name: 'Draft publication state',
      claimMod: { state: 'draft' as const },
      evidenceMod: {},
      expected: false,
    },
    {
      name: 'Private claim visibility',
      claimMod: { visibility: 'private' as const },
      evidenceMod: {},
      expected: false,
    },
    {
      name: 'Archived claim',
      claimMod: { archivedAt: '2026-08-02T00:00:00Z' as ISODateTime },
      evidenceMod: {},
      expected: false,
    },
    {
      name: 'Revoked evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'revoked' as const },
      expected: false,
    },
    {
      name: 'Disputed evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'disputed' as const },
      expected: false,
    },
    {
      name: 'Stale evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'stale' as const },
      expected: false,
    },
    {
      name: 'Broken evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'broken' as const },
      expected: false,
    },
    {
      name: 'Unverified evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'unverified' as const },
      expected: false,
    },
    {
      name: 'Unreviewed evidence state',
      claimMod: {},
      evidenceMod: { verificationState: 'unreviewed' as const },
      expected: false,
    },
    {
      name: 'Archived evidence item',
      claimMod: {},
      evidenceMod: { archivedAt: '2026-08-02T00:00:00Z' as ISODateTime },
      expected: false,
    },
    {
      name: 'Active embargo on evidence (embargoUntil in future)',
      claimMod: {},
      evidenceMod: { embargoUntil: '2099-01-01T00:00:00Z' as ISODateTime },
      expected: false,
    },
    {
      name: 'Private evidence visibility',
      claimMod: {},
      evidenceMod: { visibility: 'private' as const },
      expected: false,
    },
    {
      name: 'Automatically observed evidence (healthy when verified & public)',
      claimMod: {},
      evidenceMod: { verificationState: 'automatically_observed' as const },
      expected: true,
    },
  ];

  it.each(testMatrix)('$name', ({ claimMod, evidenceMod, expected }) => {
    const claim = { ...validClaim, ...claimMod };
    const ev = { ...healthyEvidence, ...evidenceMod };
    const result = explainClaimEligibility(claim, [supportLink], [ev]);
    expect(result.eligible).toBe(expected);
    expect(isClaimEligibleForPublicSurface(claim, [supportLink], [ev])).toBe(expected);
  });

  it('handles background statement exceptions correctly and rejects forbidden exception keywords', () => {
    const validExceptionClaim: ClaimEntity = {
      ...validClaim,
      isBackgroundStatementException: true,
      backgroundStatementExceptionReason: 'Self-taught foundational reading',
      wording: 'Enthusiastic about distributed systems and eventual consistency',
    };
    expect(isClaimEligibleForPublicSurface(validExceptionClaim, [], [])).toBe(true);

    const forbiddenExceptionClaim: ClaimEntity = {
      ...validClaim,
      isBackgroundStatementException: true,
      backgroundStatementExceptionReason: 'Self-taught',
      wording: 'Increased performance by 40% at previous employer',
    };
    expect(isClaimEligibleForPublicSurface(forbiddenExceptionClaim, [], [])).toBe(false);
  });
});
