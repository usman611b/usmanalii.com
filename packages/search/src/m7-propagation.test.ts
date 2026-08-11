import { describe, expect, it } from 'vitest';
import {
  isClaimEligibleForSearch,
  isRecordEligibleForSearch,
  buildClaimSearchDocument,
  buildRecordSearchDocument,
} from './index.js';

describe('M7 Unpublish & Invalidation Propagation Engine (Gate 5)', () => {
  it('immediately de-indexes claims from search when unpublished, unapproved, or archived', () => {
    const publishedClaim = {
      id: 'claim-1',
      wording: 'Built Cloudflare Workers backend',
      approvedWording: 'Built Cloudflare Workers backend',
      audience: 'recruiter',
      context: 'Personal Career OS',
      approvalState: 'approved',
      visibility: 'public',
      state: 'published',
      archivedAt: null,
      isEligible: true,
    };

    expect(isClaimEligibleForSearch(publishedClaim)).toBe(true);
    expect(buildClaimSearchDocument(publishedClaim)).not.toBeNull();

    const unpublishedClaim = { ...publishedClaim, state: 'draft' };
    expect(isClaimEligibleForSearch(unpublishedClaim)).toBe(false);
    expect(buildClaimSearchDocument(unpublishedClaim)).toBeNull();

    const archivedClaim = { ...publishedClaim, archivedAt: '2026-08-01T00:00:00Z' };
    expect(isClaimEligibleForSearch(archivedClaim)).toBe(false);
    expect(buildClaimSearchDocument(archivedClaim)).toBeNull();

    const ineligibleClaim = { ...publishedClaim, isEligible: false };
    expect(isClaimEligibleForSearch(ineligibleClaim)).toBe(false);
    expect(buildClaimSearchDocument(ineligibleClaim)).toBeNull();
  });

  it('immediately de-indexes experience, education, and credentials when unpublished or archived', () => {
    const publishedRecord = {
      id: 'exp-1',
      title: 'Senior Engineer at Acme',
      description: 'Built distributed systems',
      visibility: 'public',
      state: 'published',
      archivedAt: null,
    };

    expect(isRecordEligibleForSearch(publishedRecord)).toBe(true);
    expect(buildRecordSearchDocument(publishedRecord, 'experience')).not.toBeNull();

    const privateRecord = { ...publishedRecord, visibility: 'private' };
    expect(isRecordEligibleForSearch(privateRecord)).toBe(false);
    expect(buildRecordSearchDocument(privateRecord, 'experience')).toBeNull();

    const archivedRecord = { ...publishedRecord, archivedAt: '2026-08-01T00:00:00Z' };
    expect(isRecordEligibleForSearch(archivedRecord)).toBe(false);
    expect(buildRecordSearchDocument(archivedRecord, 'experience')).toBeNull();
  });
});
