import { describe, it, expect } from 'vitest';
import {
  isProjectEligibleForSearch,
  buildProjectSearchDocument,
  buildProjectSeoProjection,
  generateProjectSitemapUrls,
} from './index.js';

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

  it('4. bounded JSON extraction fails closed and removes content after publication changes', () => {
    const base = {
      id: 'p-2',
      title: 'JSON Project',
      slug: 'json-project',
      visibility: 'public',
      publicationState: 'published',
      caseStudyBody: JSON.stringify([{ type: 'paragraph', text: 'A'.repeat(1500) }]),
    };
    const indexed = buildProjectSearchDocument(base);
    expect(indexed?.searchableContent.length).toBeLessThanOrEqual(1000);
    expect(buildProjectSearchDocument({ ...base, publicationState: 'draft' })).toBeNull();
    expect(buildProjectSearchDocument({ ...base, visibility: 'private' })).toBeNull();
    expect(
      buildProjectSearchDocument({ ...base, scheduledFor: '2099-01-01T00:00:00Z' }),
    ).toBeNull();
    expect(
      buildProjectSearchDocument({ ...base, embargoUntil: '2099-01-01T00:00:00Z' }),
    ).toBeNull();
    expect(
      buildProjectSearchDocument({ ...base, caseStudyBody: 'private malformed text' }),
    ).toBeNull();
  });

  it('5. search, sitemap, canonical, robots, Open Graph and JSON-LD disappear together', () => {
    const project = {
      id: 'p-3',
      title: '</script><script>private()</script>',
      slug: 'safe-project',
      shortSummary: 'Public summary',
      visibility: 'public',
      publicationState: 'published',
    };
    const seo = buildProjectSeoProjection(project);
    expect(seo?.canonicalUrl).toBe('https://usmanalii.com/projects/safe-project');
    expect(seo?.robots).toBe('index, follow');
    expect(seo?.openGraph.description).toBe('Public summary');
    expect(seo?.jsonLd).not.toContain('</script>');
    expect(generateProjectSitemapUrls([project])).toHaveLength(1);

    for (const ineligible of [
      { ...project, publicationState: 'draft' },
      { ...project, visibility: 'private' },
      { ...project, archivedAt: '2026-08-09T00:00:00Z' },
      { ...project, deletedAt: '2026-08-09T00:00:00Z' },
      { ...project, scheduledFor: '2099-01-01T00:00:00Z' },
      { ...project, embargoUntil: '2099-01-01T00:00:00Z' },
    ]) {
      expect(buildProjectSearchDocument(ineligible)).toBeNull();
      expect(buildProjectSeoProjection(ineligible)).toBeNull();
      expect(generateProjectSitemapUrls([ineligible])).toHaveLength(0);
    }
  });
});
