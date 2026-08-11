import { describe, expect, it } from 'vitest';
import { app } from './index.js';

describe('M7 Route Unpublish & Invalidation Propagation (Gate 5)', () => {
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

  it('returns 404 RESOURCE_NOT_FOUND when requesting unpublished or archived resume variants directly', async () => {
    const res = await app.request(
      '/api/v1/public/resumes/unpublished-slug',
      { method: 'GET' },
      dummyEnv,
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 404 RESOURCE_NOT_FOUND when attempting to export an unpublished resume variant', async () => {
    const formats = ['json', 'txt', 'md', 'html'];
    for (const fmt of formats) {
      const res = await app.request(
        `/api/v1/public/resumes/unpublished-slug/export?format=${fmt}`,
        { method: 'GET' },
        dummyEnv,
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.code).toBe('RESOURCE_NOT_FOUND');
    }
  });
});
