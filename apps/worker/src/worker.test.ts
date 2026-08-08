import { describe, it, expect } from 'vitest';
import { app } from './index.js';

const mockEnv = {
  DB: {} as D1Database,
  R2_PRIVATE: {} as R2Bucket,
  R2_PUBLIC: {} as R2Bucket,
  PUBLICATION_QUEUE: {} as Queue,
  OWNER_EMAIL: 'owner@usmanalii.com',
  CF_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
  CF_ACCESS_AUD_TAG: 'test-aud-123',
  ENVIRONMENT: 'test',
};

describe('Worker API Integration & Security Tests', () => {
  // -------------------------------------------------------------------------
  // Health & Public Projections
  // -------------------------------------------------------------------------
  it('GET /api/v1/public/health — returns 200 ok with security headers', async () => {
    const res = await app.request('/api/v1/public/health', {}, mockEnv);
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string; environment: string };
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');

    // Security headers check
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(res.headers.get('X-Request-Id')).toBeDefined();
  });

  it('GET /api/v1/public/profile — returns public allowlisted DTO without private fields', async () => {
    const res = await app.request('/api/v1/public/profile', {}, mockEnv);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['displayName']).toBe('Usman Ali');
    expect(body['headline']).toBeDefined();

    // CRITICAL-04 Privacy Check: Private contactEmail and ownerId are NOT exposed
    expect('contactEmail' in body).toBe(false);
    expect('ownerId' in body).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fail-Closed Private Endpoint Protection
  // -------------------------------------------------------------------------
  it('GET /api/v1/private/dashboard/summary without auth — fails closed with 401 AUTH_REQUIRED', async () => {
    const res = await app.request('/api/v1/private/dashboard/summary', {}, mockEnv);
    expect(res.status).toBe(401);

    const body = await res.json() as { code: string; message: string; requestId: string };
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.message).toBe('Authentication required.');
    expect(body.requestId).toBeDefined();
  });

  it('GET /api/v1/private/dashboard/summary with invalid JWT header — fails closed with 401', async () => {
    const res = await app.request(
      '/api/v1/private/dashboard/summary',
      {
        headers: {
          'Cf-Access-Jwt-Assertion': 'invalid-jwt-token-string',
        },
      },
      mockEnv,
    );
    expect(res.status).toBe(401);

    const body = await res.json() as { code: string };
    expect(body.code).toBe('AUTH_REQUIRED');
  });

  // -------------------------------------------------------------------------
  // CSRF Mutation Protection
  // -------------------------------------------------------------------------
  it('POST /api/v1/public/contact with illegal origin — rejects with 403 FORBIDDEN', async () => {
    const res = await app.request(
      '/api/v1/public/contact',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://malicious-site.example.com',
        },
        body: JSON.stringify({
          name: 'Test',
          email: 'test@example.com',
          message: 'Hello world message',
          turnstileToken: 'token',
        }),
      },
      { ...mockEnv, ENVIRONMENT: 'production' },
    );
    expect(res.status).toBe(403);

    const body = await res.json() as { code: string };
    expect(body.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/public/contact with valid payload — returns 200 success', async () => {
    const res = await app.request(
      '/api/v1/public/contact',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://usmanalii.com',
        },
        body: JSON.stringify({
          name: 'Valid Visitor',
          email: 'visitor@example.com',
          message: 'Hello, this is a legitimate message for Usman.',
          turnstileToken: 'valid-turnstile-token',
        }),
      },
      mockEnv,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Non-existent route 404
  // -------------------------------------------------------------------------
  it('GET /api/v1/non-existent — returns stable 404 JSON error without leakage', async () => {
    const res = await app.request('/api/v1/non-existent', {}, mockEnv);
    expect(res.status).toBe(404);

    const body = await res.json() as { code: string };
    expect(body.code).toBe('RESOURCE_NOT_FOUND');
  });
});
