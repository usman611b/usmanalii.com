/**
 * Worker API Entrypoint — Cloudflare Worker (Hono Framework).
 *
 * Architecture §8 & Security §8: Request Pipeline execution order:
 *  1. Request correlation ID generation (`X-Request-Id`)
 *  2. Security Headers & strict CSP (`securityHeaders()`)
 *  3. CSRF & Origin validation on mutation requests (`csrfProtection()`)
 *  4. Global error handler (`globalErrorHandler`)
 *  5. Cloudflare Access RS256 JWT Authentication (`authenticate()`)
 *  6. Public & Private Route Handlers (`publicRoutes`, `privateRoutes`)
 *  7. Safe Redacted Structured Logging (`@usmanalii/observability`)
 */

import { Hono } from 'hono';
import { securityHeaders } from './middleware/security-headers.js';
import { csrfProtection } from './middleware/csrf.js';
import { globalErrorHandler } from './middleware/error-handler.js';
import { authenticate, type AuthVariables } from './middleware/auth.js';
import { publicRoutes } from './routes/public.js';
import { privateRoutes } from './routes/private.js';
import { processReconciliationQueue, D1GitHubRepository } from '@usmanalii/database';
import { GitHubClient, GitHubSyncService } from '@usmanalii/evidence';

export interface WorkerEnv {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  R2_PUBLIC: R2Bucket;
  ARTIFACTS_BUCKET?: R2Bucket;
  PUBLICATION_QUEUE: Queue;
  OWNER_EMAIL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD_TAG: string;
  PREVIEW_SECRET?: string;
  ENVIRONMENT: string;
  GITHUB_TOKEN?: string;
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  LOCAL_OWNER_TOKEN?: string;
}

const app = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();

// 1. Global Error Handler
app.onError(globalErrorHandler);

// 2. Correlation ID middleware
app.use('*', async (c, next) => {
  const reqId = c.req.header('X-Request-Id') || crypto.randomUUID();
  c.set('requestId', reqId);
  c.header('X-Request-Id', reqId);
  await next();
});

// 3. Security Headers & CSP
app.use('*', securityHeaders());

// 4. CSRF / Origin protection on mutations
app.use('*', csrfProtection());

// 5. Cloudflare Access JWT Authentication
app.use('*', authenticate());

// Local-only owner session bootstrap. This route is unreachable in every non-local environment.
app.post('/api/v1/local-auth/session', async (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (c.env.ENVIRONMENT !== 'local' || !['127.0.0.1', 'localhost'].includes(hostname)) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested API route does not exist.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  const configured = c.env.LOCAL_OWNER_TOKEN;
  const body = (await c.req.json().catch(() => ({}))) as { token?: unknown };
  const supplied = typeof body.token === 'string' ? body.token : '';
  if (!configured || configured.length < 32 || !(await tokensMatch(configured, supplied))) {
    return c.json(
      {
        code: 'AUTH_REQUIRED',
        message: 'Invalid local owner token.',
        requestId: c.get('requestId'),
      },
      401,
    );
  }
  c.header(
    'Set-Cookie',
    `local_owner_session=${encodeURIComponent(configured)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
  );
  return c.json({ authenticated: true, expiresInSeconds: 28800, requestId: c.get('requestId') });
});

app.post('/api/v1/local-auth/logout', (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (c.env.ENVIRONMENT !== 'local' || !['127.0.0.1', 'localhost'].includes(hostname)) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested API route does not exist.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  c.header('Set-Cookie', 'local_owner_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  return c.json({ authenticated: false, requestId: c.get('requestId') });
});

// 6. Mount routes
app.route('/api/v1/public', publicRoutes);
app.route('/api/v1/private', privateRoutes);

// Root fallback handler
app.notFound((c) => {
  return c.json(
    {
      code: 'RESOURCE_NOT_FOUND',
      message: 'The requested API route does not exist.',
      requestId: c.get('requestId'),
    },
    404,
  );
});

export { app };

async function tokensMatch(expected: string, supplied: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(suppliedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export function handleScheduledReconciliation(env: WorkerEnv, ctx: ExecutionContext): void {
  ctx.waitUntil(processReconciliationQueue(env.DB, env.ARTIFACTS_BUCKET ?? env.R2_PRIVATE));

  if (env.GITHUB_TOKEN) {
    const repo = new D1GitHubRepository(env.DB);
    const client = new GitHubClient({ token: env.GITHUB_TOKEN });
    const service = new GitHubSyncService(repo);
    ctx.waitUntil(
      service
        .syncSelectedRepositories('00000000-0000-0000-0000-000000000001', client)
        .catch(() => {}),
    );
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    handleScheduledReconciliation(env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
