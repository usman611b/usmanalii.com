import { describe, expect, it } from 'vitest';
import { app } from './index.js';

describe('Worker M7 API Security, Authorization & Privacy Gates (Gate 3)', () => {
  const dummyEnv = {
    DB: {} as D1Database,
    R2_PRIVATE: {} as R2Bucket,
    R2_PUBLIC: {} as R2Bucket,
    PUBLICATION_QUEUE: {} as Queue,
    OWNER_EMAIL: 'usman@example.com',
    CF_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
    CF_ACCESS_AUD_TAG: 'test-aud',
    ENVIRONMENT: 'test',
  };

  it('rejects unauthorized access to private M7 profile, experience, claims, and resume endpoints (401 AUTH_REQUIRED)', async () => {
    const endpoints = [
      '/api/v1/private/profile',
      '/api/v1/private/experience',
      '/api/v1/private/education',
      '/api/v1/private/credentials',
      '/api/v1/private/claims',
      '/api/v1/private/resumes',
      '/api/v1/private/export/m7',
    ];

    for (const ep of endpoints) {
      const res = await app.request(ep, { method: 'GET' }, dummyEnv);
      expect(res.status).toBe(401);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.code).toBe('AUTH_REQUIRED');
    }
  });

  it('serves public profile projection without exposing ownerId or private contactEmail', async () => {
    const res = await app.request('/api/v1/public/profile', { method: 'GET' }, dummyEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.displayName).toBe('Usman Ali');
    expect(json).not.toHaveProperty('ownerId');
    expect(json).not.toHaveProperty('contactEmail');
    expect(json).not.toHaveProperty('owner_id');
  });

  it('serves recruiter mode projection with expected evidence-backed structure', async () => {
    const res = await app.request('/api/v1/public/recruiter', { method: 'GET' }, dummyEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('featuredExperience');
    expect(json).toHaveProperty('featuredEducation');
    expect(json).toHaveProperty('featuredCredentials');
    expect(json).toHaveProperty('approvedClaims');
    expect(json).not.toHaveProperty('ownerId');
    expect(json).not.toHaveProperty('contactEmail');
  });

  it('rejects unauthenticated mutations to private M7 endpoints (POST/PUT/DELETE fail closed)', async () => {
    const mutations = [
      {
        path: '/api/v1/private/profile',
        method: 'PUT',
        body: { displayName: 'Hacker', versionNo: 1 },
      },
      {
        path: '/api/v1/private/experience',
        method: 'POST',
        body: { company: 'Fake Co', roleTitle: 'Dev' },
      },
      {
        path: '/api/v1/private/education',
        method: 'POST',
        body: { institution: 'Fake U', degree: 'BS' },
      },
      {
        path: '/api/v1/private/credentials',
        method: 'POST',
        body: { name: 'Fake Cert', issuingOrganization: 'Co' },
      },
      { path: '/api/v1/private/claims', method: 'POST', body: { wording: 'Fake Claim' } },
      {
        path: '/api/v1/private/resumes',
        method: 'POST',
        body: { title: 'Fake Resume', slug: 'fake' },
      },
    ];

    for (const m of mutations) {
      const res = await app.request(
        m.path,
        {
          method: m.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m.body),
        },
        dummyEnv,
      );
      expect([401, 403]).toContain(res.status);
    }
  });

  it('ensures public resume listing does not leak private internal IDs or owner tokens', async () => {
    const res = await app.request('/api/v1/public/resumes', { method: 'GET' }, dummyEnv);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Record<string, unknown>[] };
    expect(Array.isArray(json.items)).toBe(true);
    for (const item of json.items) {
      expect(item).not.toHaveProperty('ownerId');
      expect(item).not.toHaveProperty('owner_id');
      expect(item).not.toHaveProperty('internalToken');
    }
  });
});
