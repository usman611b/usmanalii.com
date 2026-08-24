/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index.js';

type QueryResult = Record<string, unknown>;

function createDb(options: {
  entry?: { id: string; comments_enabled?: number } | null;
  recentCount?: number;
  approvedComments?: QueryResult[];
}) {
  const runs: Array<{ sql: string; values: unknown[] }> = [];
  const queries: Array<{ sql: string; values: unknown[] }> = [];

  return {
    runs,
    queries,
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...nextValues: unknown[]) {
          values = nextValues;
          queries.push({ sql, values });
          return statement;
        },
        async first() {
          if (sql.includes('SELECT COUNT(*) AS count FROM journal_comments')) {
            return { count: options.recentCount ?? 0 };
          }
          if (sql.includes('SELECT id, comments_enabled FROM content_items')) {
            return options.entry === undefined
              ? { id: 'entry-1', comments_enabled: 1 }
              : options.entry;
          }
          if (sql.includes('SELECT id FROM content_items')) {
            return options.entry === undefined ? { id: 'entry-1' } : options.entry;
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM journal_comments')) {
            return { results: options.approvedComments ?? [] };
          }
          return { results: [] };
        },
        async run() {
          runs.push({ sql, values });
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
}

function env(db: ReturnType<typeof createDb>) {
  return {
    DB: db as any,
    ENVIRONMENT: 'test',
    OWNER_EMAIL: 'owner@example.com',
    CF_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
    CF_ACCESS_AUD_TAG: 'test-audience',
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
  } as any;
}

function commentRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/public/journey/shipping-notes/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:4321',
      'CF-Connecting-IP': '203.0.113.10',
      'User-Agent': 'journal-test-agent',
    },
    body: JSON.stringify({
      name: 'Reader Name',
      email: 'Reader@Example.com',
      body: 'This is a useful and sufficiently detailed response.',
      turnstileToken: 'verified-token',
      ...body,
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Journal comment privacy, moderation, and rate limits', () => {
  it('returns only approved public fields and never exposes private moderation data', async () => {
    const db = createDb({
      entry: { id: 'entry-1' },
      approvedComments: [
        {
          id: 'comment-1',
          parentCommentId: null,
          authorName: 'Public Reader',
          body: 'An approved public response.',
          createdAt: '2026-08-21T00:00:00.000Z',
        },
      ],
    });

    const response = await worker.fetch(
      new Request('http://localhost/api/v1/public/journey/shipping-notes/comments'),
      env(db),
    );
    const payload = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload.count).toBe(1);
    expect(serialized).toContain('Public Reader');
    expect(serialized).not.toContain('authorEmail');
    expect(serialized).not.toContain('author_email');
    expect(serialized).not.toContain('requestFingerprint');
    expect(serialized).not.toContain('moderationState');
    expect(db.queries.some(({ sql }) => sql.includes("moderation_state = 'approved'"))).toBe(true);
  });

  it('stores a verified response as pending, normalizes its private email, and does not echo it', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ success: true, action: 'journal-comment' }, { status: 200 }),
        ),
    );
    const db = createDb({ entry: { id: 'entry-1', comments_enabled: 1 }, recentCount: 0 });

    const response = await worker.fetch(commentRequest({}), env(db));
    const payload = (await response.json()) as Record<string, unknown>;
    const insert = db.runs.find(({ sql }) => sql.includes('INSERT INTO journal_comments'));

    expect(response.status).toBe(202);
    expect(payload.status).toBe('pending');
    expect(JSON.stringify(payload)).not.toContain('reader@example.com');
    expect(insert?.sql).toContain("'pending'");
    expect(insert?.values).toContain('reader@example.com');
    expect(insert?.values).not.toContain('Reader@Example.com');
  });

  it('rejects the fourth response in an hour before inserting comment data', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ success: true, action: 'journal-comment' }, { status: 200 }),
        ),
    );
    const db = createDb({ entry: { id: 'entry-1', comments_enabled: 1 }, recentCount: 3 });

    const response = await worker.fetch(commentRequest({}), env(db));
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(429);
    expect(payload.code).toBe('COMMENT_RATE_LIMITED');
    expect(db.runs).toHaveLength(0);
    const rateQuery = db.queries.find(({ sql }) => sql.includes('datetime'));
    expect(rateQuery?.sql).toContain("'-1 hour'");
    expect(rateQuery?.values[0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns an opaque 404 and does not invoke verification for an unpublished entry', async () => {
    const turnstile = vi.fn();
    vi.stubGlobal('fetch', turnstile);
    const db = createDb({ entry: null });

    const response = await worker.fetch(commentRequest({}), env(db));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(payload.code).toBe('NOT_FOUND');
    expect(JSON.stringify(payload)).not.toContain('draft');
    expect(turnstile).not.toHaveBeenCalled();
    expect(db.runs).toHaveLength(0);
  });
});
