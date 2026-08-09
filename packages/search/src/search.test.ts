import { describe, it, expect } from 'vitest';
import { isProjectEligibleForSearch, buildProjectSearchDocument } from './index.js';

describe('Milestone M5 — Search Projection Engine Tests', () => {
  it('1. isProjectEligibleForSearch accepts public, published, non-archived projects without future schedule/embargo', () => {
    const valid = isProjectEligibleForSearch({
      id: 'p-1',
      title: 'Secure Monorepo',
      slug: 'secure-monorepo',
      visibility: 'public',
      publicationState: 'published',
    });
    expect(valid).toBe(true);
  });

  it('2. isProjectEligibleForSearch rejects private, draft, scheduled, embargoed, or archived projects', () => {
    expect(
      isProjectEligibleForSearch({
        id: 'p-1',
        title: 'Draft Project',
        slug: 'draft-project',
        visibility: 'private',
        publicationState: 'draft',
      }),
    ).toBe(false);

    expect(
      isProjectEligibleForSearch({
        id: 'p-1',
        title: 'Future Scheduled',
        slug: 'future-scheduled',
        visibility: 'public',
        publicationState: 'published',
        scheduledFor: '2099-01-01T00:00:00Z',
      }),
    ).toBe(false);

    expect(
      isProjectEligibleForSearch({
        id: 'p-1',
        title: 'Archived Project',
        slug: 'archived-project',
        visibility: 'public',
        publicationState: 'published',
        archivedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe(false);
  });

  it('3. buildProjectSearchDocument creates search projection and excludes private engineering items', () => {
    const doc = buildProjectSearchDocument(
      {
        id: 'p-1',
        title: 'Secure Monorepo Architecture',
        slug: 'secure-monorepo',
        shortSummary: 'Case study on D1, Workers, and Astro monorepo security',
        visibility: 'public',
        publicationState: 'published',
      },
      [
        {
          type: 'adr',
          title: 'ADR-001: Cloudflare Access Auth',
          summary: 'Use CF-Access JWT headers',
          visibility: 'public',
          state: 'published',
        },
        {
          type: 'debugging_lesson',
          title: 'Internal Memory Leak',
          summary: 'Internal log leak',
          visibility: 'private',
          state: 'draft',
        },
      ],
      ['TypeScript', 'Cloudflare Workers'],
      ['Design Secure Multi-Tenant APIs'],
    );

    expect(doc).not.toBeNull();
    expect(doc?.searchableContent).toContain('Secure Monorepo Architecture');
    expect(doc?.searchableContent).toContain('ADR-001: Cloudflare Access Auth');
    expect(doc?.searchableContent).not.toContain('Internal Memory Leak'); // Private child excluded!
  });
});
