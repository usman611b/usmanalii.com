import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>usmanalii.com — Learning Journey &amp; Technical Log</title>
  <link>https://usmanalii.com/journey</link>
  <description>Chronological engineering journal and technical deep dives by Usman Ali.</description>
  <language>en-us</language>
  <atom:link href="https://usmanalii.com/feed.xml" rel="self" type="application/rss+xml" />
  
  <item>
    <title>Monorepo Security Architecture &amp; WebCrypto JWT Pipeline</title>
    <link>https://usmanalii.com/journey/monorepo-security-architecture</link>
    <guid>https://usmanalii.com/journey/monorepo-security-architecture</guid>
    <pubDate>Sat, 08 Aug 2026 12:00:00 GMT</pubDate>
    <description>Architectural documentation of RS256 token verification, Cloudflare Access integration, CSP headers, and fail-closed D1 storage.</description>
  </item>

  <item>
    <title>Building the Versioned JSON-Block Content Engine (M2)</title>
    <link>https://usmanalii.com/journey/building-versioned-json-block-content-engine</link>
    <guid>https://usmanalii.com/journey/building-versioned-json-block-content-engine</guid>
    <pubDate>Sat, 08 Aug 2026 14:00:00 GMT</pubDate>
    <description>Design and implementation of canonical structured JSON blocks, optimistic concurrency version_no, GFM export, and publication validation.</description>
  </item>
</channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
