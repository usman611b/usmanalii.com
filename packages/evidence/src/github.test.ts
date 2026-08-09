import { describe, expect, test, vi } from 'vitest';
import { GitHubClient } from './github-client.js';
import { GitHubSyncService } from './github-sync-service.js';

describe('GitHub Client & Sync Service (M6)', () => {
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

  test('GitHubSyncService discovers repositories and runs incremental sync', async () => {
    const mockRepo: any = {
      upsertRepositories: vi.fn(),
      recordRateLimitSnapshot: vi.fn(),
      getOwnerIdentity: vi.fn().mockResolvedValue({
        githubUserId: 100,
        githubLogin: 'usmanalii',
        commitEmails: ['usman@example.com'],
      }),
      listRepositories: vi.fn().mockResolvedValue([
        { id: 'r-1', githubRepoId: 1, fullName: 'usmanalii/portfolio', isPrivate: false },
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
            { id: 1, name: 'portfolio', full_name: 'usmanalii/portfolio', private: false, html_url: 'https://github.com/usmanalii/portfolio' },
          ],
        });
      }
      if (url.includes('/commits')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ etag: '"commit-etag"', 'x-ratelimit-remaining': '4899' }),
          json: async () => [
            {
              sha: 'c-100',
              html_url: 'https://github.com/usmanalii/portfolio/commit/c-100',
              author: { id: 100, login: 'usmanalii' },
              commit: { message: 'feat: initial commit', author: { email: 'usman@example.com', date: '2026-08-01T00:00:00Z' } },
            },
          ],
        });
      }
      if (url.includes('/releases')) {
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

    const discRes = await service.discoverRepositories('owner-1', client);
    expect(discRes.count).toBe(1);
    expect(mockRepo.upsertRepositories).toHaveBeenCalled();

    const syncRes = await service.syncSelectedRepositories('owner-1', client);
    expect(syncRes.success).toBe(true);
    expect(syncRes.repositoriesProcessed).toBe(1);
    expect(syncRes.itemsImported).toBe(1);
    expect(syncRes.candidatesCreated).toBe(1);
    expect(mockRepo.createCandidates).toHaveBeenCalledWith(
      'owner-1',
      expect.arrayContaining([
        expect.objectContaining({
          attributionStatus: 'verified_owner',
          candidateTitle: 'feat: initial commit',
        }),
      ]),
    );
  });
});
