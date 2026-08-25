/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { app } from './index.js';

describe('Cloudflare Worker GitHub API Routes & Security (M6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockEnv = (overrides: Record<string, unknown> = {}) => {
    const repos = new Map<string, any>();
    const candidates = new Map<string, any>();
    const identities = new Map<string, any>();

    const db: any = {
      prepare(sql: string) {
        const createQueryObj = (...params: any[]) => ({
          async first() {
            if (sql.includes('github_owner_identities')) {
              return identities.get(params[0]) || null;
            }
            if (sql.includes('github_repositories')) {
              return repos.get(params[1]) || null;
            }
            if (sql.includes('evidence_candidates')) {
              return candidates.get(params[1]) || null;
            }
            return null;
          },
          async all() {
            if (sql.includes('github_repositories')) {
              return { results: Array.from(repos.values()) };
            }
            if (sql.includes('evidence_candidates')) {
              return { results: Array.from(candidates.values()) };
            }
            if (sql.includes('FROM projects')) {
              return {
                results: [
                  {
                    id: 'project-created-today',
                    date_iso: new Date().toISOString(),
                    type: 'project_milestone',
                    visibility: 'public',
                    state: 'published',
                  },
                ],
              };
            }
            return { results: [] };
          },
          async run() {
            if (sql.includes('INSERT INTO github_owner_identities')) {
              identities.set(params[1], {
                id: params[0],
                ['owner' + '_id']: params[1],
                github_user_id: params[2],
                github_login: params[3],
                commit_emails_json: params[4],
                verification_status: params[5],
                owner_approval: params[6],
                last_verified_at: params[7],
                created_at: params[8],
                updated_at: params[9],
              });
              return { meta: { rows_written: 1 } };
            }
            if (sql.includes('UPDATE github_repositories SET selected_for_sync')) {
              const r = repos.get(params[3]);
              if (!r) return { meta: { rows_written: 0 } };
              r.selected_for_sync = params[0];
              return { meta: { rows_written: 1 } };
            }
            return { meta: { rows_written: 1 } };
          },
          bind(...newParams: any[]) {
            return createQueryObj(...newParams);
          },
        });

        return createQueryObj();
      },
      async batch() {
        return [];
      },
    };

    return {
      DB: db,
      R2_PRIVATE: {} as any,
      R2_PUBLIC: {} as any,
      PUBLICATION_QUEUE: {} as any,
      OWNER_EMAIL: 'usman@example.com',
      CF_ACCESS_TEAM_DOMAIN: 'usmanalii.cloudflareaccess.com',
      CF_ACCESS_AUD_TAG: 'test-aud',
      ENVIRONMENT: 'test',
      GITHUB_TOKEN: 'secret-token-xyz-never-leak',
      ...overrides,
    };
  };

  test('Private integration endpoints fail closed without auth (401 AUTH_REQUIRED)', async () => {
    const env = createMockEnv();
    const statusReq = new Request('http://localhost/api/v1/private/integrations/github/status');
    const candReq = new Request('http://localhost/api/v1/private/integrations/github/candidates');

    const res1 = await app.fetch(statusReq, env);
    const res2 = await app.fetch(candReq, env);

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });

  test('GET /api/v1/private/integrations/github/status requires auth and returns active status without leaking token', async () => {
    const env = createMockEnv();
    const req = new Request('http://localhost/api/v1/private/integrations/github/status', {
      headers: {
        Authorization: 'Bearer test-jwt-token',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('inactive'); // Identity not set yet
    expect(body.hasToken).toBe(true);
    expect(JSON.stringify(body)).not.toContain('secret-token-xyz-never-leak');
  });

  test('PUT GitHub identity uses authenticated ownership and rejects owner and approval mass assignment', async () => {
    const env = createMockEnv();
    const req = new Request('http://localhost/api/v1/private/integrations/github/identity', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:4321',
        Authorization: 'Bearer test-jwt-token',
      },
      body: JSON.stringify({
        githubUserId: 998877,
        githubLogin: 'usmanalii',
        commitEmails: ['usman@example.com'],
        ownerId: 'attacker-owner',
        ownerApproval: false,
        verificationStatus: 'revoked',
      }),
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.identity.githubLogin).toBe('usmanalii');
    expect(body.identity.ownerId).not.toBe('attacker-owner');
    expect(body.identity.ownerApproval).toBe(true);
    expect(body.identity.verificationStatus).toBe('verified');
  });

  test('GitHub mutation routes enforce CSRF and return opaque owner-scoped IDOR failures', async () => {
    const env = createMockEnv();
    const csrfResponse = await app.fetch(
      new Request('http://localhost/api/v1/private/integrations/github/identity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt-token',
        },
        body: JSON.stringify({ githubUserId: 998877, githubLogin: 'usmanalii' }),
      }),
      env,
    );
    expect(csrfResponse.status).toBe(403);

    const idorResponse = await app.fetch(
      new Request(
        'http://localhost/api/v1/private/integrations/github/repositories/foreign-repo/sync-toggle',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:4321',
            Authorization: 'Bearer test-jwt-token',
          },
          body: JSON.stringify({ selectedForSync: true }),
        },
      ),
      env,
    );
    expect(idorResponse.status).toBe(404);
    expect(await idorResponse.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  test('GET /api/v1/public/activity returns public heatmap projection with count masking', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
    const env = createMockEnv();
    const req = new Request('http://localhost/api/v1/public/activity?timezone=UTC');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.projection).toBeDefined();
    expect(body.projection.timezone).toBe('UTC');
    expect(body.projection.cells).toHaveLength(365);
    expect(body.projection.activeDaysCount).toBe(1);
    expect(body.projection.cells.at(-1).count).toBe(1);
  });
});
