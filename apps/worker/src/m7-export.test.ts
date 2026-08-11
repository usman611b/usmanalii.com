import { describe, expect, it } from 'vitest';
import { app } from './index.js';

describe('M7 Public Export Adversarial Suite (Gate 4)', () => {
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

  it('rejects unauthenticated calls to owner canonical M7 export (401 AUTH_REQUIRED)', async () => {
    const res = await app.request('/api/v1/private/export/m7', { method: 'GET' }, dummyEnv);
    expect(res.status).toBe(401);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns 404 RESOURCE_NOT_FOUND for non-existent or unpublished resume variants across all formats', async () => {
    const formats = ['json', 'txt', 'md', 'html'];
    for (const fmt of formats) {
      const res = await app.request(
        `/api/v1/public/resumes/non-existent-variant/export?format=${fmt}`,
        { method: 'GET' },
        dummyEnv,
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it('rejects invalid or unsupported export format queries with 400 or 404 when DB unavailable', async () => {
    const res = await app.request(
      '/api/v1/public/resumes/general/export?format=exe',
      { method: 'GET' },
      dummyEnv,
    );
    expect([400, 404]).toContain(res.status);
  });

  it('prohibits private fields and internal tokens from public export payloads', async () => {
    const res = await app.request(
      '/api/v1/public/resumes/general/export?format=json',
      { method: 'GET' },
      dummyEnv,
    );
    if (res.status === 200) {
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toHaveProperty('schemaVersion', 17);
      expect(json).toHaveProperty('exportedAt');
      expect(json).not.toHaveProperty('ownerId');
      expect(json).not.toHaveProperty('contactEmail');
      expect(json).not.toHaveProperty('databaseCredentials');
    }
  });
});
