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

  it('SECURITY: JWKS network error returns redacted public response without stack trace or internal error strings', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/v1/private/dashboard/summary', {
        headers: {
          'Cf-Access-Jwt-Assertion': 'eyJraWQiOiJmYWtlLWtpZCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxMjMifQ.c2ln',
        },
      }),
      {
        ...env,
        CF_ACCESS_TEAM_DOMAIN: 'https://invalid-nonexistent-domain-12345.com',
      },
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.message).toBe('Authentication required.');
    // Confirm NO internal error details or stack traces are leaked to caller
    expect(body.stack).toBeUndefined();
    expect(body.internalError).toBeUndefined();
  });
});
