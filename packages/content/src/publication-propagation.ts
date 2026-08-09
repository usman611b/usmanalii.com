/**
 * Publication Propagation & Projection Engine (`publication-propagation.ts`).
 *
 * Implements public Projection rules, RSS feed XML generator, and Sitemap XML generator:
 *  1. Journey Index filtering (`filterPublicProjections`).
 *  2. RSS Feed generation (`generateRssFeedXml`).
 *  3. Sitemap XML generation (`generateSitemapXml`).
 *  4. Direct Entry Route resolution (`resolveDirectEntryRoute`).
 *  5. Cache & static invalidation directives (`getCacheHeadersForState`).
 */

import type { ContentItemEntity } from '@usmanalii/domain';

/** Filter items for public surface projections (Journey index, Search, Public API) */
export function filterPublicProjections(
  items: ContentItemEntity[],
  now: Date = new Date(),
): ContentItemEntity[] {
  return items.filter((item) => {
    if (item.state !== 'published') return false;
    if (item.visibility !== 'public') return false;
    if (item.archivedAt !== null) return false;
    if (item.deletedAt !== null) return false;
    if (item.scheduledFor !== null && new Date(item.scheduledFor) > now) return false;
    if (item.embargoUntil !== null && new Date(item.embargoUntil) > now) return false;
    return true;
  });
}

/** Generate RSS Feed XML from published public items */
export function generateRssFeedXml(items: ContentItemEntity[], now: Date = new Date()): string {
  const publicItems = filterPublicProjections(items, now);

  const itemXmls = publicItems
    .map((item) => {
      const pubDateStr = item.publishedAt
        ? new Date(item.publishedAt).toUTCString()
        : new Date().toUTCString();
      return `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>https://usmanalii.com/journey/${item.slug}</link>
    <guid>https://usmanalii.com/journey/${item.slug}</guid>
    <pubDate>${pubDateStr}</pubDate>
    <description>${escapeXml(item.summary || '')}</description>
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>usmanalii.com — Learning Journey &amp; Technical Log</title>
  <link>https://usmanalii.com/journey</link>
  <description>Chronological engineering journal and technical deep dives by Usman Ali.</description>
  <language>en-us</language>
  <atom:link href="https://usmanalii.com/feed.xml" rel="self" type="application/rss+xml" />
${itemXmls}
</channel>
</rss>`;
}

/** Generate Sitemap XML from published public items */
export function generateSitemapXml(items: ContentItemEntity[], now: Date = new Date()): string {
  const publicItems = filterPublicProjections(items, now);

  const urlXmls = publicItems
    .map((item) => {
      const lastModDate = item.updatedAt ? item.updatedAt.split('T')[0] : '2026-08-08';
      return `  <url>
    <loc>https://usmanalii.com/journey/${item.slug}</loc>
    <lastmod>${lastModDate}</lastmod>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://usmanalii.com/journey</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${urlXmls}
</urlset>`;
}

/** Resolve direct entry route accessibility */
export function resolveDirectEntryRoute(
  item: ContentItemEntity | null,
  now: Date = new Date(),
): { accessible: true; item: ContentItemEntity } | { accessible: false; httpStatus: 404 } {
  if (!item) return { accessible: false, httpStatus: 404 };
  const publicItems = filterPublicProjections([item], now);
  if (publicItems.length === 0) return { accessible: false, httpStatus: 404 };
  return { accessible: true, item: publicItems[0]! };
}

/** Cache & invalidation headers based on state and visibility */
export function getCacheHeadersForState(
  item: ContentItemEntity,
  now: Date = new Date(),
): Record<string, string> {
  const isPublic = filterPublicProjections([item], now).length > 0;

  if (isPublic) {
    return {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=60',
      'X-Robots-Tag': 'index, follow',
    };
  }

  // Unpublished, draft, unlisted, or private — invalidate cache & prevent indexing
  return {
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
