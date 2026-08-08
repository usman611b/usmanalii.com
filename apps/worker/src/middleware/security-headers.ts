/**
 * Security Headers & Content Security Policy (CSP) Middleware.
 *
 * Security Threat Model §18 (Release gates):
 * Enforces production security headers on all API responses.
 */

import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../index.js';

export function securityHeaders(): MiddlewareHandler<{ Bindings: WorkerEnv }> {
  return async (c, next) => {
    await next();

    // Prevent MIME-sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking iframe embedding
    c.header('X-Frame-Options', 'DENY');

    // Strict Referrer Policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Disable unused browser features
    c.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()',
    );

    // Strict Content Security Policy for API responses
    const csp = [
      "default-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "json-schema 'none'",
    ].join('; ');

    c.header('Content-Security-Policy', csp);

    // HSTS for production and staging
    const env = c.env.ENVIRONMENT;
    if (env === 'production' || env === 'staging') {
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
  };
}
