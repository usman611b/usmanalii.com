/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import type { ContentItemEntity } from '@usmanalii/domain';
import {
  filterPublicProjections,
  generateRssFeedXml,
  generateSitemapXml,
  resolveDirectEntryRoute,
  getCacheHeadersForState,
} from './publication-propagation.js';

describe('Requirement 4: Publish / Unpublish Propagation Tests', () => {
  const publishedItem: ContentItemEntity = {
    id: 'item-201' as any,
    ownerId: 'owner-1' as any,
    contentType: 'journal',
    title: 'Published Engineering Log',
    slug: 'published-engineering-log',
    summary: 'A published log summary.',
    bodyFormat: 'json_blocks',
    bodySchemaVersion: 'v1',
    readingTimeMinutes: 5,
    visibility: 'public',
    state: 'published',
    occurredAt: '2026-08-08T12:00:00Z' as any,
    publishedAt: '2026-08-08T12:00:00Z' as any,
    scheduledFor: null,
    embargoUntil: null,
    createdAt: '2026-08-08T12:00:00Z' as any,
    updatedAt: '2026-08-08T12:00:00Z' as any,
    archivedAt: null,
    deletedAt: null,
    versionNo: 1,
  };

  const draftItem: ContentItemEntity = {
    ...publishedItem,
    id: 'item-202' as any,
    title: 'Draft Engineering Log',
    slug: 'draft-engineering-log',
    state: 'draft',
  };

  const unlistedItem: ContentItemEntity = {
    ...publishedItem,
    id: 'item-203' as any,
    title: 'Unlisted Engineering Log',
    slug: 'unlisted-engineering-log',
    state: 'unlisted',
  };

  const archivedItem: ContentItemEntity = {
    ...publishedItem,
    id: 'item-204' as any,
    title: 'Archived Engineering Log',
    slug: 'archived-engineering-log',
    state: 'archived',
    archivedAt: '2026-08-08T14:00:00Z' as any,
  };

  const allItems = [publishedItem, draftItem, unlistedItem, archivedItem];

  it('1. Journey Index & Search Projection: includes published item only', () => {
    const publicProjections = filterPublicProjections(allItems);
    const slugs = publicProjections.map((i) => i.slug);

    expect(slugs).toContain('published-engineering-log');
    expect(slugs).not.toContain('draft-engineering-log');
    expect(slugs).not.toContain('unlisted-engineering-log');
    expect(slugs).not.toContain('archived-engineering-log');
  });

  it('2. Direct Entry Route: published returns 200, unpublished/unlisted/draft returns 404', () => {
    expect(resolveDirectEntryRoute(publishedItem).accessible).toBe(true);
    expect(resolveDirectEntryRoute(draftItem).accessible).toBe(false);
    expect(resolveDirectEntryRoute(unlistedItem).accessible).toBe(false);
    expect(resolveDirectEntryRoute(archivedItem).accessible).toBe(false);
    expect(resolveDirectEntryRoute(null).accessible).toBe(false);
  });

  it('3. RSS Feed XML: includes published entry and excludes draft/unlisted/archived', () => {
    const feedXml = generateRssFeedXml(allItems);

    expect(feedXml).toContain('<title>Published Engineering Log</title>');
    expect(feedXml).toContain('https://usmanalii.com/journey/published-engineering-log');
    expect(feedXml).not.toContain('Draft Engineering Log');
    expect(feedXml).not.toContain('Unlisted Engineering Log');
    expect(feedXml).not.toContain('Archived Engineering Log');
  });

  it('4. Sitemap XML: includes published entry loc and excludes draft/unlisted/archived', () => {
    const sitemapXml = generateSitemapXml(allItems);

    expect(sitemapXml).toContain(
      '<loc>https://usmanalii.com/journey/published-engineering-log</loc>',
    );
    expect(sitemapXml).not.toContain('draft-engineering-log');
    expect(sitemapXml).not.toContain('unlisted-engineering-log');
    expect(sitemapXml).not.toContain('archived-engineering-log');
  });

  it('5. Static & Cache Invalidation Behavior: public vs unpublished headers', () => {
    const publicHeaders = getCacheHeadersForState(publishedItem);
    expect(publicHeaders['Cache-Control']).toContain('public');
    expect(publicHeaders['X-Robots-Tag']).toBe('index, follow');

    const draftHeaders = getCacheHeadersForState(draftItem);
    expect(draftHeaders['Cache-Control']).toBe('private, no-store, no-cache, must-revalidate');
    expect(draftHeaders['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(draftHeaders['Referrer-Policy']).toBe('no-referrer');
  });

  it('6. Unpublishing propagation: transitioning published item to unlisted immediately purges it from feed, sitemap, index, and direct route', () => {
    // Initial state: published -> present in all surfaces
    expect(filterPublicProjections([publishedItem])).toHaveLength(1);
    expect(generateRssFeedXml([publishedItem])).toContain('published-engineering-log');

    // Unpublishing transition: state -> unlisted
    const nowUnlisted: ContentItemEntity = { ...publishedItem, state: 'unlisted' };

    expect(filterPublicProjections([nowUnlisted])).toHaveLength(0);
    expect(resolveDirectEntryRoute(nowUnlisted).accessible).toBe(false);
    expect(generateRssFeedXml([nowUnlisted])).not.toContain('published-engineering-log');
    expect(generateSitemapXml([nowUnlisted])).not.toContain('published-engineering-log');
    expect(getCacheHeadersForState(nowUnlisted)['X-Robots-Tag']).toBe('noindex, nofollow');
  });
});
