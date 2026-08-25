import { describe, expect, it } from 'vitest';
import { fetchJournalEntries, type JournalSummary } from './JournalIndex';

describe('JournalIndex live loading', () => {
  it('recovers when the Journal API succeeds after transient failures', async () => {
    const entry: JournalSummary = {
      id: 'day-21',
      slug: 'ai-engineer-journey-day-21',
      title: 'Day 21',
    };
    let attempts = 0;
    const request = (async () => {
      attempts += 1;
      if (attempts < 3) return new Response('Unavailable', { status: 503 });
      return Response.json({ items: [entry] });
    }) as typeof fetch;

    const entries = await fetchJournalEntries(request, undefined, async () => undefined);

    expect(attempts).toBe(3);
    expect(entries).toEqual([entry]);
  });

  it('fails closed when the API never returns canonical Journal data', async () => {
    const request = (async () => Response.json({ entries: [] })) as typeof fetch;

    await expect(fetchJournalEntries(request, undefined, async () => undefined)).rejects.toThrow(
      'invalid data',
    );
  });
});
