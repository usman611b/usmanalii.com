import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://usmanalii.com/journey</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://usmanalii.com/journey/monorepo-security-architecture</loc>
    <lastmod>2026-08-08</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://usmanalii.com/journey/building-versioned-json-block-content-engine</loc>
    <lastmod>2026-08-08</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
