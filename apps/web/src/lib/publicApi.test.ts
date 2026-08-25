import { describe, expect, it } from 'vitest';
import { fetchJsonWithRetry, fetchWithRetry } from './publicApi';

describe('resilient public API loading', () => {
  it('recovers from transient service failures without using cached data', async () => {
    let attempts = 0;
    const seenInit: RequestInit[] = [];
    const request = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      attempts += 1;
      seenInit.push(init ?? {});
      if (attempts < 3) return new Response('Unavailable', { status: 503 });
      return Response.json({ items: ['live'] });
    }) as typeof fetch;

    const payload = await fetchJsonWithRetry<{ items: string[] }>(
      '/api/v1/public/journey',
      {},
      request,
      async () => undefined,
    );

    expect(attempts).toBe(3);
    expect(payload.items).toEqual(['live']);
    expect(seenInit.every((init) => init.cache === 'no-store')).toBe(true);
  });

  it('does not retry a permanent not-found response', async () => {
    let attempts = 0;
    const request = (async () => {
      attempts += 1;
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const response = await fetchWithRetry(
      '/api/v1/public/projects/missing',
      {},
      request,
      async () => undefined,
    );

    expect(response.status).toBe(404);
    expect(attempts).toBe(1);
  });
});
