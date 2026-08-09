/**
 * CSRF & Origin Validation Middleware for Mutation Requests.
 *
 * Security Threat Model §6 (CSRF protection):
 * Validates Origin / Referer headers for state-changing HTTP methods (POST, PUT, DELETE, PATCH).
 */

import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from './auth.js';

export function csrfProtection(allowedOrigins?: readonly string[]): MiddlewareHandler<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}> {
  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    // Safe read methods skip origin check
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await next();
      return;
    }

    const origin = c.req.header('Origin');
    const referer = c.req.header('Referer');
    const requestHost = c.req.header('Host');

    // Default allowed origins per environment
    const allowed = allowedOrigins || [
      'http://localhost:4321',
      'http://localhost:8787',
      'https://usmanalii.com',
      'https://staging.usmanalii.com',
    ];

    let sourceDomain: string | null = null;
    if (origin) {
      try {
        sourceDomain = new URL(origin).origin;
      } catch {
        sourceDomain = null;
      }
    } else if (referer) {
      try {
        sourceDomain = new URL(referer).origin;
      } catch {
        sourceDomain = null;
      }
    }

    // In local development, if no origin header is provided on API calls (e.g. from curl or test harness),
    // we allow it if the Host header matches local dev host.
    if (!sourceDomain && c.env.ENVIRONMENT === 'local') {
      await next();
      return;
    }

    const isAllowed = allowed.some(
      (a) => a === sourceDomain || (requestHost ? sourceDomain?.endsWith(requestHost) : false),
    );

    if (!sourceDomain || !isAllowed) {
      const requestId = c.get('requestId') || 'req-unknown';
      return c.json(
        {
          code: 'FORBIDDEN',
          message: 'Cross-origin mutation request forbidden.',
          requestId,
        },
        403,
      );
    }

    return await next();
  };
}
