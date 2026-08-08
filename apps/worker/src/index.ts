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

export interface WorkerEnv {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  R2_PUBLIC: R2Bucket;
  PUBLICATION_QUEUE: Queue;
  OWNER_EMAIL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD_TAG: string;
  PREVIEW_SECRET?: string;
  ENVIRONMENT: string;
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

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<WorkerEnv>;
