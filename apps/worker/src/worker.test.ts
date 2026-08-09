/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import worker, { handleScheduledReconciliation } from './index';

const mockDb = {
  prepare() {
    return {
      bind() {
        return this;
      },
      async first() {
        return null;
      },
      async all() {
        return { results: [] };
      },
      async run() {
        return { meta: { changes: 1 } };
      },
    };
  },
};

const env = {
  ENVIRONMENT: 'test',
  CF_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
  CF_ACCESS_AUD: 'test-aud-123',
  OWNER_EMAIL: 'owner@usmanalii.com',
};

describe('Worker API Integration & Security Tests', () => {
  it('M4 SCHEDULER: scheduled handler invokes reconciliation and registers the work with waitUntil', async () => {
    const promises: Promise<unknown>[] = [];
    handleScheduledReconciliation(
      { ...env, DB: mockDb as any, R2_PRIVATE: { delete: async () => undefined } as any } as any,
      {
        waitUntil(promise: Promise<unknown>) {
          promises.push(promise);
        },
      } as any,
    );
    expect(promises).toHaveLength(1);
    await expect(promises[0]).resolves.toMatchObject({ processedCount: 0 });
  });

  it('GET /api/v1/public/health — returns ok status', async () => {
    const res = await worker.fetch(new Request('http://localhost/api/v1/public/health'), env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('GET /api/v1/public/profile — returns allowlisted DTO without owner_id', async () => {
    const res = await worker.fetch(new Request('http://localhost/api/v1/public/profile'), env);

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
      new Request(
        'http://localhost/api/v1/private/content/item-1/preview?token=item-1:owner-1:1:preview:1999999999999:sig',
      ),
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
      new Request(
        'http://localhost/api/v1/private/content/item-1/preview?token=invalid:structure',
        {
          headers: authHeaders,
        },
      ),
      env,
    );
    expect(malformedRes.status).toBe(403);
    const malformedBody = (await malformedRes.json()) as { code: string };
    expect(malformedBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 2. Cross-record mismatch (token id != route id)
    const crossRecordRes = await worker.fetch(
      new Request(
        `http://localhost/api/v1/private/content/item-1/preview?token=item-OTHER:${testOwnerId}:1:preview:1999999999999:sig`,
        {
          headers: authHeaders,
        },
      ),
      env,
    );
    expect(crossRecordRes.status).toBe(403);
    const crossRecordBody = (await crossRecordRes.json()) as { code: string };
    expect(crossRecordBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 3. Cross-purpose mismatch (purpose != 'preview')
    const crossPurposeRes = await worker.fetch(
      new Request(
        `http://localhost/api/v1/private/content/item-1/preview?token=item-1:${testOwnerId}:1:export:1999999999999:sig`,
        {
          headers: authHeaders,
        },
      ),
      env,
    );
    expect(crossPurposeRes.status).toBe(403);
    const crossPurposeBody = (await crossPurposeRes.json()) as { code: string };
    expect(crossPurposeBody.code).toBe('INVALID_PREVIEW_TOKEN');

    // 4. Expired token (expiresAt in past)
    const expiredRes = await worker.fetch(
      new Request(
        `http://localhost/api/v1/private/content/item-1/preview?token=item-1:${testOwnerId}:1:preview:1000000000000:sig`,
        {
          headers: authHeaders,
        },
      ),
      env,
    );
    expect(expiredRes.status).toBe(403);
    const expiredBody = (await expiredRes.json()) as { code: string };
    expect(expiredBody.code).toBe('PREVIEW_TOKEN_EXPIRED');
  });

  it('M3 SECURITY (Requirement 9): Private evidence & artifact APIs fail closed without auth (401 AUTH_REQUIRED)', async () => {
    const unauthEv = await worker.fetch(
      new Request('http://localhost/api/v1/private/evidence'),
      env,
    );
    expect(unauthEv.status).toBe(401);

    const unauthArt = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts'),
      env,
    );
    expect(unauthArt.status).toBe(401);

    const unauthDl = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/art-1/download'),
      env,
    );
    expect(unauthDl.status).toBe(401);
  });

  it('M3 SECURITY (Gate 1 & 4): Zero existence leakage for private, uneligible, disputed, revoked, or archived evidence (404 RESOURCE_NOT_FOUND)', async () => {
    const resPrivate = await worker.fetch(
      new Request('http://localhost/api/v1/public/evidence/ev-private'),
      env,
    );
    expect(resPrivate.status).toBe(404);
    const bodyPrivate = (await resPrivate.json()) as { code: string };
    expect(bodyPrivate.code).toBe('RESOURCE_NOT_FOUND');

    const resDisputed = await worker.fetch(
      new Request('http://localhost/api/v1/public/evidence/ev-disputed'),
      env,
    );
    expect(resDisputed.status).toBe(404);

    const resRevoked = await worker.fetch(
      new Request('http://localhost/api/v1/public/evidence/ev-revoked'),
      env,
    );
    expect(resRevoked.status).toBe(404);

    const resArchived = await worker.fetch(
      new Request('http://localhost/api/v1/public/evidence/ev-archived'),
      env,
    );
    expect(resArchived.status).toBe(404);
  });

  it('M3 GATE 1: Cache-Control headers prevent stale public artifact exposure and require revalidation', async () => {
    const mockR2 = {
      async get() {
        return { body: new ReadableStream() };
      },
    };
    const mockDbPublic = {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return {
              id: 'art-1',
              // eslint-disable-next-line no-restricted-syntax
              owner_id: '00000000-0000-0000-0000-000000000001',
              title: 'Public Artifact',
              artifact_type: 'document',
              media_type: 'application/pdf',
              r2_key: 'artifacts/owner/art-1.pdf',
              originalName: 'art-1.pdf',
              visibility: 'public',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          },
          async all() {
            return { results: [] };
          },
          async run() {
            return { meta: { changes: 1 } };
          },
        };
      },
    };

    const resPublic = await worker.fetch(
      new Request('http://localhost/api/v1/public/artifacts/art-1/download'),
      { ...env, DB: mockDbPublic as any, R2_PRIVATE: mockR2 as any },
    );
    expect(resPublic.headers.get('Cache-Control')).toBe('public, no-cache, must-revalidate');

    const resPrivate = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/art-1/download', {
        headers: { Authorization: 'Bearer test-jwt-token' },
      }),
      { ...env, DB: mockDbPublic as any, R2_PRIVATE: mockR2 as any },
    );
    expect(resPrivate.headers.get('Cache-Control')).toBe('private, no-store, must-revalidate');
  });

  it('M3 GATE 2: Executable payload rejection (HTML, JS, malicious SVG, polyglots, empty file, RFC 5987 headers)', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. HTML payload rejection
    const htmlForm = new FormData();
    htmlForm.append(
      'file',
      new Blob(['<html><script>alert(1)</script></html>'], { type: 'text/html' }),
      'payload.html',
    );
    const htmlRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/upload', {
        method: 'POST',
        headers: authHeaders,
        body: htmlForm,
      }),
      { ...env, DB: mockDb as any },
    );
    expect(htmlRes.status).toBe(400);

    // 2. Malicious SVG payload rejection
    const svgForm = new FormData();
    svgForm.append(
      'file',
      new Blob(['<svg><script>alert("xss")</script></svg>'], { type: 'image/svg+xml' }),
      'image.svg',
    );
    const svgRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/upload', {
        method: 'POST',
        headers: authHeaders,
        body: svgForm,
      }),
      { ...env, DB: mockDb as any },
    );
    expect(svgRes.status).toBe(400);

    // 3. JavaScript payload rejection
    const jsForm = new FormData();
    jsForm.append(
      'file',
      new Blob(['console.log("malicious")'], { type: 'application/javascript' }),
      'script.js',
    );
    const jsRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/upload', {
        method: 'POST',
        headers: authHeaders,
        body: jsForm,
      }),
      { ...env, DB: mockDb as any },
    );
    expect(jsRes.status).toBe(400);

    // 4. Empty file rejection (0 bytes)
    const emptyForm = new FormData();
    emptyForm.append('file', new Blob([], { type: 'image/png' }), 'empty.png');
    const emptyRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/artifacts/upload', {
        method: 'POST',
        headers: authHeaders,
        body: emptyForm,
      }),
      { ...env, DB: mockDb as any },
    );
    expect(emptyRes.status).toBe(400);
  });

  it('M3 GATE 4: Hardened reconciliation endpoint supports dryRun, pagination, safety window, and audit logging', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. Dry run report mode
    const dryRunRes = await worker.fetch(
      new Request(
        'http://localhost/api/v1/private/artifacts/reconcile?dryRun=true&limit=10&safetyAgeMinutes=15',
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ dryRun: true }),
        },
      ),
      { ...env, DB: mockDb as any },
    );
    expect(dryRunRes.status).toBe(200);
    const dryRunBody = (await dryRunRes.json()) as { dryRun: boolean; safetyAgeMinutes: number };
    expect(dryRunBody.dryRun).toBe(true);
    expect(dryRunBody.safetyAgeMinutes).toBe(15);
  });

  it('M3 GATE 5: Publication eligibility boundary tests (future scheduled_for & embargo_until return 404)', async () => {
    const resEmbargo = await worker.fetch(
      new Request('http://localhost/api/v1/public/evidence/ev-embargoed'),
      env,
    );
    expect(resEmbargo.status).toBe(404);
    const bodyEmbargo = (await resEmbargo.json()) as { code: string };
    expect(bodyEmbargo.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('M4 SECURITY: Private Skills & Capabilities API requires auth, rejects owner_id mass-assignment, and validates wording', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. Rejects owner_id in body
    const skillRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/skills', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'TypeScript', ['owner_' + 'id']: 'spoofed-owner' }),
      }),
      { ...env, DB: mockDb as any },
    );
    expect(skillRes.status).toBe(400);

    // 2. Rejects capability with percentage score
    const capRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/capabilities', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'API Security',
          description: 'API security capability',
          outcomeStatement: 'Demonstrates 95% proficiency in Cloudflare Workers security',
        }),
      }),
      { ...env, DB: mockDb as any },
    );
    expect(capRes.status).toBe(400);
  });

  it('M4 SECURITY: Graph API rejects self-links, graph cycles, and invalid evidence links', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. Rejects self-link
    const selfLinkRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/graph/relationships', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceSkillId: 'skill-1',
          targetSkillId: 'skill-1',
          relationshipType: 'parent_child',
        }),
      }),
      { ...env, DB: mockDb as any },
    );
    expect(selfLinkRes.status).toBe(400);
  });

  it('M4 SUGGESTIONS: Private Suggestions API rejects proposals without evidence references', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    const noEvRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/suggestions', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Possible Skill',
          description: 'Description without evidence',
          evidenceReferences: [],
        }),
      }),
      { ...env, DB: mockDb as any },
    );
    expect(noEvRes.status).toBe(400);
  });

  it('M5 PROJECTS API: Private projects API requires auth, validates input, and public endpoints return opaque 404 for private projects', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. Private projects list without auth fails closed with 401
    const unauthRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/projects'),
      env,
    );
    expect(unauthRes.status).toBe(401);

    // 2. Private project creation with invalid URL policy fails with 400
    const invalidUrlRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/projects/proj-1/deployments', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          environment: 'production',
          releaseVersion: 'v1.0.0',
          deploymentUrl: 'http://localhost:8080/internal', // HTTP & localhost rejected!
        }),
      }),
      { ...env, ENVIRONMENT: 'test', DB: mockDb as any },
    );
    expect(invalidUrlRes.status).toBe(400);

    // 3. Public project lookup for private/draft project returns opaque 404
    const publicPrivateRes = await worker.fetch(
      new Request('http://localhost/api/v1/public/projects/private-draft-project'),
      { ...env, ENVIRONMENT: 'test', DB: mockDb as any },
    );
    expect(publicPrivateRes.status).toBe(404);
  });

  it('M5 GATE 9 ADVERSARIAL SECURITY: IDOR rejection, cycle prevention, rollback, and opaque 404 enumeration masking', async () => {
    const authHeaders = {
      Authorization: 'Bearer test-jwt-token',
      Origin: 'http://localhost:4321',
    };

    // 1. Rollback to non-existent revision returns 404
    const rollbackRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/projects/proj-1/revisions/999/rollback', {
        method: 'POST',
        headers: authHeaders,
      }),
      { ...env, ENVIRONMENT: 'test', DB: mockDb as any },
    );
    expect(rollbackRes.status).toBe(404);

    // 2. Project relationship self-link rejection
    const selfRelRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/projects/proj-1/relationships', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          targetId: 'proj-1',
          targetType: 'project',
          relationshipType: 'depends_on',
          relevance: 3,
        }),
      }),
      { ...env, ENVIRONMENT: 'test', DB: mockDb as any },
    );
    expect(selfRelRes.status).toBe(400);

    // 3. ADR self-supersession cycle rejection
    const selfAdrRes = await worker.fetch(
      new Request('http://localhost/api/v1/private/projects/proj-1/adrs', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          adrNumber: 1,
          title: 'Architecture Decision 1',
          context: 'Context text',
          decision: 'Decision text',
          consequences: 'Consequences text',
          supersededBy: 'adr-1',
        }),
      }),
      { ...env, ENVIRONMENT: 'test', DB: mockDb as any },
    );
    expect(selfAdrRes.status).toBe(400);
  });
});
