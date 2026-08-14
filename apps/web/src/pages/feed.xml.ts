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
</channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
