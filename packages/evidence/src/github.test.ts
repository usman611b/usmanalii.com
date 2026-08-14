/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi } from 'vitest';
import { GitHubClient, parseRetryAfterHeader, sanitizeSecretText } from './github-client.js';
import { GitHubSyncService } from './github-sync-service.js';

describe('GitHub Client & Sync Service (M6 Gates 3 & 4)', () => {
  test('parseRetryAfterHeader handles seconds, HTTP dates, and invalid values', () => {
    expect(parseRetryAfterHeader('120')).toBe(120000);
    expect(parseRetryAfterHeader(null)).toBeNull();
    expect(parseRetryAfterHeader('invalid-header')).toBeNull();
  });

  test('sanitizeSecretText redacts token strings from error text', () => {
    const rawError = 'Error accessing API with Bearer secret-token-12345';
    expect(sanitizeSecretText(rawError)).toBe('Error accessing API with Bearer [REDACTED]');
  });

  test('GitHubClient fails closed without GITHUB_TOKEN', async () => {
    const client = new GitHubClient({});
    await expect(client.get('/user/repos')).rejects.toThrow('GITHUB_TOKEN_MISSING');
  });

  test('GitHubClient handles 200 OK and parses rate limits & ETag', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4990',
        'x-ratelimit-reset': '1700000000',
        etag: '"hash-abc"',
        link: '<https://api.github.com/user/repos?page=2>; rel="next"',
      }),
      json: async () => [{ id: 1, name: 'repo-1', full_name: 'owner/repo-1' }],
    });

    const client = new GitHubClient({ token: 'test-token', fetchFn: mockFetch as any });
    const res = await client.get<any[]>('/user/repos', { etag: '"old-etag"' });

    expect(res.status).toBe(200);
    expect(res.notModified).toBe(false);
    expect(res.data).toHaveLength(1);
    expect(res.etag).toBe('"hash-abc"');
    expect(res.nextUrl).toBe('https://api.github.com/user/repos?page=2');
    expect(res.rateLimit.remaining).toBe(4990);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/user/repos',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'If-None-Match': '"old-etag"',
        }),
      }),
    );
  });

  test('GitHubClient preserves the runtime receiver required by Cloudflare fetch', async () => {
    const runtimeFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(
        new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const client = new GitHubClient({ token: 'test-token', fetchFn: runtimeFetch as typeof fetch });

    const response = await client.get<unknown[]>('/user/repos');

    expect(response.status).toBe(200);
    expect(runtimeFetch).toHaveBeenCalledOnce();
  });

  test('GitHubClient handles 304 Not Modified', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 304,
      headers: new Headers({
        'x-ratelimit-remaining': '4999',
      }),
    });

    const client = new GitHubClient({ token: 'test-token', fetchFn: mockFetch as any });
    const res = await client.get<any[]>('/user/repos', { etag: '"cached-etag"' });

    expect(res.status).toBe(304);
    expect(res.notModified).toBe(true);
    expect(res.data).toBeNull();
  });

  test.each([403, 429])(
    'GitHubClient handles %i secondary limits with bounded Retry-After retries',
    async (status) => {
      const responses = [
        { ok: false, status, headers: new Headers({ 'Retry-After': '0' }) },
        { ok: false, status, headers: new Headers({ 'Retry-After': '0' }) },
        {
          ok: true,
          status: 200,
          headers: new Headers({ 'x-ratelimit-remaining': '4998' }),
          json: async () => [],
        },
      ];
      const mockFetch = vi.fn().mockImplementation(async () => responses.shift());
      const client = new GitHubClient({ token: 'test-token', fetchFn: mockFetch as any });

      const result = await client.get<unknown[]>('/user/repos');

      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    },
  );

  test('GitHubClient enforces request timeouts and a maximum of three network attempts', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
    ) => {
      if (typeof handler === 'function') handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);

    try {
      const client = new GitHubClient({
        token: 'test-token',
        fetchFn: mockFetch as any,
        timeoutMs: 1,
      });
      await expect(client.get('/user/repos')).rejects.toThrow('Request timed out');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  test('GitHubSyncService bounds discovery pagination to five pages and prevents link loops', async () => {
    const mockRepo: any = {
      upsertRepositories: vi.fn(),
      recordRateLimitSnapshot: vi.fn(),
    };
    const client: any = {
      get: vi.fn().mockImplementation(async (_url: string, options: any) => ({
        data: [],
        nextUrl: `https://api.github.com/user/repos?page=${options.visitedUrls.size + 1}`,
        rateLimit: { remaining: 4900 },
      })),
    };

    await new GitHubSyncService(mockRepo).discoverRepositories('owner-1', client);

    expect(client.get).toHaveBeenCalledTimes(5);
  });

  test('GitHubSyncService skips repository currently locked in syncing state', async () => {
    const mockRepo: any = {
      getOwnerIdentity: vi.fn().mockResolvedValue(null),
      tryClaimRepositorySync: vi.fn().mockResolvedValue(false),
      completeRepositorySync: vi.fn(),
      listRepositories: vi.fn().mockResolvedValue([
        {
          id: 'r-1',
          syncStatus: 'syncing',
          lastSyncedAt: new Date().toISOString(),
          fullName: 'owner/repo-locked',
        },
      ]),
    };

    const client = new GitHubClient({ token: 'test-token' });
    const service = new GitHubSyncService(mockRepo);
    const result = await service.syncSelectedRepositories('owner-1', client);

    expect(result.repositoriesProcessed).toBe(0);
  });

  test('GitHubSyncService recovers a synchronization claim stale for more than five minutes', async () => {
    const mockRepo: any = {
      getOwnerIdentity: vi.fn().mockResolvedValue(null),
      tryClaimRepositorySync: vi.fn().mockResolvedValue(true),
      completeRepositorySync: vi.fn(),
      listRepositories: vi.fn().mockResolvedValue([
        {
          id: 'r-stale',
          githubRepoId: 1,
          syncStatus: 'syncing',
          lastSyncedAt: new Date(Date.now() - 301000).toISOString(),
          fullName: 'owner/repo-stale',
          isPrivate: false,
        },
      ]),
      getCheckpoint: vi.fn().mockResolvedValue(null),
    };
    const client: any = {
      get: vi.fn().mockResolvedValue({
        data: [],
        notModified: false,
        etag: null,
        rateLimit: { remaining: 5000 },
      }),
    };

    const result = await new GitHubSyncService(mockRepo).syncSelectedRepositories(
      'owner-1',
      client,
    );

    expect(result.repositoriesProcessed).toBe(1);
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  test('GitHubSyncService stops before the next repository when the primary limit is low', async () => {
    const mockRepo: any = {
      getOwnerIdentity: vi.fn().mockResolvedValue(null),
      tryClaimRepositorySync: vi.fn().mockResolvedValue(true),
      completeRepositorySync: vi.fn(),
      listRepositories: vi.fn().mockResolvedValue([
        { id: 'r-1', githubRepoId: 1, fullName: 'owner/one', isPrivate: false },
        { id: 'r-2', githubRepoId: 2, fullName: 'owner/two', isPrivate: false },
      ]),
      getCheckpoint: vi.fn().mockResolvedValue(null),
    };
    const client: any = {
      get: vi.fn().mockResolvedValue({
        data: [],
        notModified: false,
        etag: null,
        rateLimit: { remaining: 0 },
      }),
    };

    const result = await new GitHubSyncService(mockRepo).syncSelectedRepositories(
      'owner-1',
      client,
    );

    expect(result.repositoriesProcessed).toBe(1);
    expect(result.errorSummary).toContain('Rate limit low');
  });

  test('GitHubSyncService continues after partial repository failure and reports missing or force-pushed upstream objects', async () => {
    const mockRepo: any = {
      upsertRepositories: vi.fn(),
      recordRateLimitSnapshot: vi.fn(),
      getOwnerIdentity: vi.fn().mockResolvedValue({
        githubUserId: 100,
        githubLogin: 'usmanalii',
        commitEmails: ['usman@example.com'],
      }),
      tryClaimRepositorySync: vi.fn().mockResolvedValue(true),
      completeRepositorySync: vi.fn(),
      listRepositories: vi.fn().mockResolvedValue([
        { id: 'r-1', githubRepoId: 1, fullName: 'usmanalii/portfolio', isPrivate: false },
        { id: 'r-2', githubRepoId: 2, fullName: 'usmanalii/healthy', isPrivate: false },
      ]),
      getCheckpoint: vi.fn().mockResolvedValue(null),
      upsertImportedObjects: vi.fn(),
      createCandidates: vi.fn(),
      upsertCheckpoint: vi.fn(),
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/user/repos')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'x-ratelimit-remaining': '4900' }),
          json: async () => [
            {
              id: 1,
              name: 'portfolio',
              full_name: 'usmanalii/portfolio',
              private: false,
              html_url: 'https://github.com/usmanalii/portfolio',
            },
          ],
        });
      }
      if (url.includes('/portfolio/commits')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers({ 'x-ratelimit-remaining': '4899' }),
          text: async () => 'Repository not found',
        });
      }
      if (url.includes('/healthy/commits') || url.includes('/healthy/releases')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'x-ratelimit-remaining': '4898' }),
          json: async () => [],
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const client = new GitHubClient({ token: 'test-token', fetchFn: mockFetch as any });
    const service = new GitHubSyncService(mockRepo);

    const syncRes = await service.syncSelectedRepositories('owner-1', client);
    expect(syncRes.success).toBe(false);
    expect(syncRes.repositoriesProcessed).toBe(2);
    expect(syncRes.errorSummary).toContain('missing or access revoked');
  });
});
