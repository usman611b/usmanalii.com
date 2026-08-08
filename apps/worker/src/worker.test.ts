import { describe, it, expect } from 'vitest';
import worker from './index';

const env = {
  ENVIRONMENT: 'test',
  CF_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
  CF_ACCESS_AUD: 'test-aud-123',
  OWNER_EMAIL: 'owner@usmanalii.com',
};

describe('Worker API Integration & Security Tests', () => {
  it('GET /api/v1/public/health — returns ok status', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/health'),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('GET /api/v1/public/profile — returns allowlisted DTO without owner_id', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/profile'),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.displayName).toBe('Usman Ali');
    expect(body.headline).toBe('Systems Architect & Senior Software Engineer');
    expect(body.owner_id).toBeUndefined(); // SECURITY: owner_id not exposed
  });

  it('GET /api/v1/private/dashboard/summary without auth — fails closed with 401 AUTH_REQUIRED', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/private/dashboard/summary'),
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string; message: string; requestId: string };
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.message).toBe('Authentication required.');
    expect(body.requestId).toBeDefined();
    // Confirm stack trace is redacted
    expect((body as Record<string, unknown>).stack).toBeUndefined();
  });

  it('GET /api/v1/private/dashboard/summary with invalid JWT header — fails closed with 401 and redacted error', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/private/dashboard/summary', {
        headers: {
          'Cf-Access-Jwt-Assertion': 'invalid.jwt.token',
        },
      }),
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('AUTH_REQUIRED');
    expect((body as Record<string, unknown>).stack).toBeUndefined();
  });

  it('POST /api/v1/public/contact with valid same-origin — accepts mutation', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
          Host: 'localhost',
        },
        body: JSON.stringify({
          name: 'Jane Recruiter',
          email: 'jane@company.com',
          message: 'Hello Usman, interested in your systems architecture role.',
          turnstileToken: 'test-token-123',
        }),
      }),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('NEGATIVE: POST /api/v1/public/contact with MISSING Origin & Referer — fails closed with 403 FORBIDDEN', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing Origin & missing Referer
        },
        body: JSON.stringify({
          name: 'Attacker',
          email: 'attacker@evil.com',
          message: 'CSRF attack without headers',
          turnstileToken: 'test-token-123',
        }),
      }),
      env,
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('Cross-origin mutation request forbidden.');
  });

  it('NEGATIVE: POST /api/v1/public/contact with SPOOFED Origin — fails closed with 403 FORBIDDEN', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://malicious-attacker.com',
        },
        body: JSON.stringify({
          name: 'Attacker',
          email: 'attacker@evil.com',
          message: 'Cross-origin mutation attack',
          turnstileToken: 'test-token-123',
        }),
      }),
      env,
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('Cross-origin mutation request forbidden.');
  });

  it('NEGATIVE: POST /api/v1/public/contact with SPOOFED Referer — fails closed with 403 FORBIDDEN', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://phishing-site.example.com/fake-form',
        },
        body: JSON.stringify({
          name: 'Attacker',
          email: 'attacker@evil.com',
          message: 'Spoofed referer attack',
          turnstileToken: 'test-token-123',
        }),
      }),
      env,
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('Cross-origin mutation request forbidden.');
  });

  it('SECURITY (Gate 1): GET /api/v1/private/content/item-1/preview WITHOUT Cloudflare Access JWT header fails closed with 401 AUTH_REQUIRED', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/private/content/item-1/preview?token=item-1:owner-1:1:preview:1999999999999:sig'),
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('AUTH_REQUIRED');
  });

  it('SECURITY (Gate 1): GET /api/v1/public/journey/preview endpoint NO LONGER EXISTS (404 NOT_FOUND)', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/public/journey/preview?id=item-1&token=abc'),
      env,
    );

    expect(res.status).toBe(404);
  });

  it('PREVIEW TOKEN SECURITY (Requirement 7): Validates token bindings & fails on malformed/expired/mismatched tokens', async () => {
    const testOwnerId = '00000000-0000-0000-0000-000000000001';
    const authHeaders = { Authorization: 'Bearer test-jwt-token' };

    // 1. Malformed token structure (fewer than 6 parts)
    const malformedRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/content/item-1/preview?token=invalid:structure', {
        headers: authHeaders,
      }),
      env,
    );
    expect(malformedRes.status).toBe(403);
    const malformedBody = (await malformedRes.json()) as { code: string };
    expect(malformedBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 2. Cross-record mismatch (token id != route id)
    const crossRecordRes = await worker.fetch(
      new Request(`http://localhost/api/v1/private/content/item-1/preview?token=item-OTHER:${testOwnerId}:1:preview:1999999999999:sig`, {
        headers: authHeaders,
      }),
      env,
    );
    expect(crossRecordRes.status).toBe(403);
    const crossRecordBody = (await crossRecordRes.json()) as { code: string };
    expect(crossRecordBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 3. Cross-purpose mismatch (purpose != 'preview')
    const crossPurposeRes = await worker.fetch(
      new Request(`http://localhost/api/v1/private/content/item-1/preview?token=item-1:${testOwnerId}:1:export:1999999999999:sig`, {
        headers: authHeaders,
      }),
      env,
    );
    expect(crossPurposeRes.status).toBe(403);
    const crossPurposeBody = (await crossPurposeRes.json()) as { code: string };
    expect(crossPurposeBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 4. Expired token (expiresAt in past)
    const expiredRes = await worker.fetch(
      new Request(`http://localhost/api/v1/private/content/item-1/preview?token=item-1:${testOwnerId}:1:preview:1000000000000:sig`, {
        headers: authHeaders,
      }),
      env,
    );
    expect(expiredRes.status).toBe(403);
    const expiredBody = (await expiredRes.json()) as { code: string };
    expect(expiredBody.code).toBe('PREVIEW_TOKEN_EXPIRED');
  });
});
