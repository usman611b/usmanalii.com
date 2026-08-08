/**
 * Cloudflare Access JWT Authentication & Authorization Middleware.
 *
 * CRITICAL SECURITY RULES (CRITICAL-01 & CRITICAL-02):
 *  1. Header presence alone is NOT authentication. The JWT signature must be cryptographically
 *     verified using RS256 with JWKS key resolution and key rotation support.
 *  2. Issuer, audience, expiration, AND exact secret `OWNER_EMAIL` match are required.
 *  3. Fail-closed: Private endpoints reject unauthenticated or non-owner requests before any D1 query.
 *  4. IDOR prevention: Error responses return opaque machine codes without entity-existence leakage.
 */

import type { MiddlewareHandler } from 'hono';
import {
  verifyAccessJwtCryptographically,
  JwksKeyCache,
  type AuthorizationContext,
  type JwksKeySet,
} from '@usmanalii/authorization';
import type { WorkerEnv } from '../index.js';
import { createLogEntry } from '@usmanalii/observability';

// Global memory cache for JWKS keys per team domain
const jwksCacheMap = new Map<string, JwksKeyCache>();

function getJwksCache(teamDomain: string): JwksKeyCache {
  let cache = jwksCacheMap.get(teamDomain);
  if (!cache) {
    const fetcher = async (): Promise<JwksKeySet | null> => {
      try {
        const certsUrl = `${teamDomain.replace(/\/$/, '')}/cdn-cgi/access/certs`;
        const res = await fetch(certsUrl);
        if (!res.ok) return null;
        return (await res.json()) as JwksKeySet;
      } catch {
        return null;
      }
    };
    cache = new JwksKeyCache(fetcher);
    jwksCacheMap.set(teamDomain, cache);
  }
  return cache;
}

/**
 * Custom Hono variables context extension.
 */
export interface AuthVariables {
  authContext: AuthorizationContext | null;
  requestId: string;
}

/**
 * Authentication middleware — validates JWT and populates `authContext` variable.
 * Does NOT block request — allows downstream middleware/routes to decide if auth is required.
 */
export function authenticate(
  overrides?: {
    teamDomain?: string;
    audTag?: string;
    ownerEmail?: string;
    jwksCache?: JwksKeyCache;
  },
): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AuthVariables }> {
  return async (c, next) => {
    const requestId = c.get('requestId') || crypto.randomUUID();
    c.set('requestId', requestId);

    const teamDomain = overrides?.teamDomain || c.env.CF_ACCESS_TEAM_DOMAIN;
    const audTag = overrides?.audTag || c.env.CF_ACCESS_AUD_TAG;
    const ownerEmail = overrides?.ownerEmail || c.env.OWNER_EMAIL;

    // Extract token from Cf-Access-Jwt-Assertion header or Bearer header
    const accessHeader = c.req.header('Cf-Access-Jwt-Assertion');
    const authHeader = c.req.header('Authorization');
    let rawJwt: string | undefined = accessHeader;

    if (!rawJwt && authHeader && authHeader.startsWith('Bearer ')) {
      rawJwt = authHeader.slice(7).trim();
    }

    if (!rawJwt || !teamDomain || !audTag || !ownerEmail) {
      c.set('authContext', null);
      await next();
      return;
    }

    const jwksCache = overrides?.jwksCache || getJwksCache(teamDomain);

    const validation = await verifyAccessJwtCryptographically(
      rawJwt,
      jwksCache,
      teamDomain,
      audTag,
      ownerEmail,
    );

    if (!validation.valid) {
      const logEntry = createLogEntry('warn', 'JWT verification failed', {
        environment: c.env.ENVIRONMENT || 'local',
        requestId,
        route: c.req.path,
        errorCode: 'AUTH_INVALID_TOKEN',
        statusCode: 401,
      });
      console.warn(JSON.stringify(logEntry));

      c.set('authContext', null);
      await next();
      return;
    }

    // Verified owner authorization context
    const now = new Date();
    // Deterministic EntityId representation for owner identity
    const ownerId = '00000000-0000-0000-0000-000000000001' as import('@usmanalii/domain').EntityId;

    const authContext: AuthorizationContext = {
      authenticatedSubject: validation.subject,
      ownerId,
      isOwner: true,
      requestId,
      validatedAt: now,
      expiresAt: validation.expiresAt,
    };

    c.set('authContext', authContext);
    await next();
  };
}

/**
 * Fail-closed authorization guard middleware for private endpoints.
 * Requires verified owner `authContext` or rejects with 401/403.
 *
 * SECURITY: Returns opaque error response without leaking entity existence.
 */
export function requireOwnerAuth(): MiddlewareHandler<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}> {
  return async (c, next) => {
    const authContext = c.get('authContext');
    const requestId = c.get('requestId') || 'req-unknown';

    if (!authContext || !authContext.isOwner || authContext.expiresAt <= new Date()) {
      const logEntry = createLogEntry('warn', 'Unauthorized access attempt to private endpoint', {
        environment: c.env.ENVIRONMENT || 'local',
        requestId,
        route: c.req.path,
        errorCode: authContext ? 'FORBIDDEN' : 'AUTH_REQUIRED',
        statusCode: authContext ? 403 : 401,
      });
      console.warn(JSON.stringify(logEntry));

      return c.json(
        {
          code: authContext ? 'FORBIDDEN' : 'AUTH_REQUIRED',
          message: authContext ? 'Access denied.' : 'Authentication required.',
          requestId,
        },
        authContext ? 403 : 401,
      );
    }

    return await next();
  };
}
