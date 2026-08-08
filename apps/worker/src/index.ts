/**
 * Worker API entry point.
 *
 * SECURITY ARCHITECTURE (Architecture §8, Security §8):
 * Every request passes through these layers IN ORDER:
 *  1. Route and request parsing (Hono)
 *  2. Authentication — validate Cf-Access-Jwt-Assertion (CRITICAL-01)
 *  3. Authorization — establish owner context (CRITICAL-02)
 *  4. Application use case
 *  5. Domain rules
 *  6. D1/R2 repository (never exposed to browser)
 *  7. Response DTO and field redaction
 *  8. Audit and telemetry (safe fields only)
 *
 * SECURITY: D1 and R2 bindings NEVER reach browser code.
 * SECURITY: owner_id is NEVER accepted from request bodies.
 * SECURITY: Public endpoints never accept visibility filters from clients.
 *
 * M0 NOTE: This is a skeleton. Authentication middleware and routes are
 * implemented in M1 (E02). This file establishes the architecture pattern.
 */

import { Hono } from 'hono';
import { createLogEntry } from '@usmanalii/observability';

// Cloudflare Worker bindings interface
// SECURITY: These bindings are never exposed to browser code
export interface WorkerEnv {
  // D1 database binding — Worker-only (CRITICAL-02)
  DB: D1Database;
  // R2 buckets — private originals, never public URLs (CRITICAL-03)
  R2_PRIVATE: R2Bucket;
  R2_PUBLIC: R2Bucket;
  // Queue for background jobs
  PUBLICATION_QUEUE: Queue;
  // Secrets — from Cloudflare secret storage, not plaintext env
  // Access configuration (ADR-003) — set via: wrangler secret put OWNER_EMAIL
  OWNER_EMAIL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD_TAG: string;
  // Environment identifier
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: WorkerEnv }>();

// ---------------------------------------------------------------------------
// Health check — public-safe variant (Architecture §9)
// SECURITY: Never expose internal state, database counts or private entity info
// ---------------------------------------------------------------------------
app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    // SECURITY: No database info, no private counts, no internal state
  });
});

// ---------------------------------------------------------------------------
// M0 placeholder routes — implementations in M1+
// ---------------------------------------------------------------------------
app.all('/api/v1/*', (c) => {
  const entry = createLogEntry('info', 'API route not yet implemented', {
    environment: c.env.ENVIRONMENT,
    requestId: 'placeholder',
    route: c.req.path,
    statusCode: 501,
  });
  console.warn(JSON.stringify(entry));

  return c.json(
    {
      code: 'SERVICE_UNAVAILABLE',
      message: 'This endpoint is not yet implemented. M0 foundation only.',
      requestId: 'placeholder',
    },
    501,
  );
});

// ---------------------------------------------------------------------------
// Default handler
// ---------------------------------------------------------------------------
export default {
  fetch: app.fetch,
} satisfies ExportedHandler<WorkerEnv>;
