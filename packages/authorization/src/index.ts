/**
 * Authorization package — Identity, ownership and visibility policy.
 *
 * This package implements the authorization model described in:
 *  - Security Threat Model §8 (authorization order)
 *  - Database Model §13 (D1 authorization model)
 *  - Technical Architecture §10 (authentication and authorization)
 *
 * CRITICAL SECURITY RULES (from CRITICAL-01 and CRITICAL-02):
 *  1. JWT MUST BE CRYPTOGRAPHICALLY VALIDATED — signature, JWKS key, issuer, audience,
 *     expiry, exact owner identity, and key rotation. Header presence alone is NOT authentication.
 *  2. Every repository call must receive an authorization context.
 *  3. owner_id is NEVER accepted from client requests.
 *  4. Authorization happens BEFORE data access, never after response creation.
 */

import type { EntityId, Visibility } from '@usmanalii/domain';

// ---------------------------------------------------------------------------
// Authorization context — established once per request from validated JWT
// ---------------------------------------------------------------------------

/**
 * Immutable authorization context created from a validated Cloudflare Access JWT.
 * This is the ONLY source of owner identity in the system.
 * It is NEVER derived from request body, query params or headers other than the JWT.
 */
export interface AuthorizationContext {
  /** Authenticated subject (email or sub from Access JWT). */
  readonly authenticatedSubject: string;

  /** Verified owner EntityId — resolved from the configured OWNER_IDENTITY. */
  readonly ownerId: EntityId;

  /** Whether the authenticated subject matches the configured owner. */
  readonly isOwner: boolean;

  /** Request ID for correlation and audit. */
  readonly requestId: string;

  /** When the JWT was validated. */
  readonly validatedAt: Date;

  /** JWT expiry — requests must not proceed after this. */
  readonly expiresAt: Date;
}

// ---------------------------------------------------------------------------
// JWT validation result
// ---------------------------------------------------------------------------

export type JwtValidationResult =
  | {
      valid: true;
      subject: string;
      email: string;
      expiresAt: Date;
    }
  | {
      valid: false;
      reason:
        | 'missing'
        | 'invalid_format'
        | 'invalid_signature'
        | 'key_not_found'
        | 'expired'
        | 'wrong_audience'
        | 'wrong_issuer'
        | 'owner_mismatch'
        | 'keys_unavailable';
    };

// ---------------------------------------------------------------------------
// Authorization check result
// ---------------------------------------------------------------------------

export type AuthorizationResult =
  | { authorized: true }
  | { authorized: false; reason: string };

// ---------------------------------------------------------------------------
// JWKS Key Structures & Cryptographic Verification
// ---------------------------------------------------------------------------

export interface JwkKey {
  readonly kty: string;
  readonly kid: string;
  readonly alg?: string;
  readonly use?: string;
  readonly n: string;
  readonly e: string;
}

export interface JwksKeySet {
  readonly keys: readonly JwkKey[];
}

/**
 * Base64URL decodes a string into a Uint8Array.
 */
export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses a raw JWT string into its header, claims, signed data, and signature bytes.
 */
export function parseJwtParts(jwtToken: string): {
  header: { kid?: string; alg?: string };
  claims: CloudflareAccessJwtClaims;
  signedData: Uint8Array;
  signature: Uint8Array;
} | null {
  const parts = jwtToken.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  try {
    const headerJson = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(headerB64)),
    ) as { kid?: string; alg?: string };
    const claimsJson = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as CloudflareAccessJwtClaims;
    const signature = base64UrlDecode(signatureB64);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    return {
      header: headerJson,
      claims: claimsJson,
      signedData,
      signature,
    };
  } catch {
    return null;
  }
}

/**
 * Cryptographically verifies an RS256 signature using WebCrypto (crypto.subtle).
 */
export async function verifyJwtSignature(
  signedData: Uint8Array,
  signature: Uint8Array,
  jwk: JwkKey,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signedDataBuffer = signedData.buffer as ArrayBuffer;
    const signatureBuffer = signature.buffer as ArrayBuffer;
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signatureBuffer,
      signedDataBuffer,
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// JWKS Key Cache with Rotation Support
// ---------------------------------------------------------------------------

export class JwksKeyCache {
  private cache: Map<string, JwkKey> = new Map();
  private lastFetchedAt: number = 0;
  private ttlMs: number = 3_600_000; // 1 hour TTL

  constructor(
    private readonly fetchJwks: () => Promise<JwksKeySet | null>,
    ttlMs?: number,
  ) {
    if (ttlMs) this.ttlMs = ttlMs;
  }

  /**
   * Retrieves a key by ID (`kid`). If missing or cache expired, refreshes from JWKS.
   * Handles signing-key rotation seamlessly.
   */
  async getKey(kid: string): Promise<JwkKey | null> {
    const now = Date.now();
    const isExpired = now - this.lastFetchedAt > this.ttlMs;

    if (!isExpired && this.cache.has(kid)) {
      return this.cache.get(kid) ?? null;
    }

    // Refresh keys
    const jwks = await this.fetchJwks();
    if (!jwks) return null;

    this.cache.clear();
    for (const key of jwks.keys) {
      this.cache.set(key.kid, key);
    }
    this.lastFetchedAt = now;

    return this.cache.get(kid) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Full Cryptographic JWT Validation (Signature + Claims)
// ---------------------------------------------------------------------------

export interface CloudflareAccessJwtClaims {
  sub: string;
  email: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  nbf?: number;
  type?: string;
  identity_nonce?: string;
}

/**
 * Full cryptographic Access JWT verification:
 *  1. Parse JWT header, payload, signature
 *  2. Validate algorithm `alg === 'RS256'` (reject 'none', 'HS256', etc.)
 *  3. Find matching public key by `kid` in JWKS
 *  4. Cryptographically verify RS256 signature via WebCrypto
 *  5. Validate issuer (`iss`)
 *  6. Validate application audience (`aud`)
 *  7. Validate token expiration (`exp`) & Not Before (`nbf`)
 *  8. Validate exact owner identity match (`email === expectedOwnerEmail`)
 */
export async function verifyAccessJwtCryptographically(
  rawJwt: string | null | undefined,
  jwksCache: JwksKeyCache,
  expectedIssuer: string,
  expectedAudience: string,
  expectedOwnerEmail: string,
  now: Date = new Date(),
): Promise<JwtValidationResult> {
  if (!rawJwt) {
    return { valid: false, reason: 'missing' };
  }

  const parsed = parseJwtParts(rawJwt);
  if (!parsed) {
    return { valid: false, reason: 'invalid_format' };
  }

  const { header, claims, signedData, signature } = parsed;

  // Validate algorithm — RS256 required. Reject 'none', 'HS256', etc.
  if (!header.alg || header.alg !== 'RS256') {
    return { valid: false, reason: 'invalid_format' };
  }

  if (!header.kid) {
    return { valid: false, reason: 'invalid_format' };
  }

  // 1. Get public signing key (with rotation support)
  let jwk: JwkKey | null = null;
  try {
    jwk = await jwksCache.getKey(header.kid);
  } catch {
    return { valid: false, reason: 'keys_unavailable' };
  }

  if (!jwk) {
    return { valid: false, reason: 'key_not_found' };
  }

  // 2. Cryptographically verify RS256 signature
  const sigValid = await verifyJwtSignature(signedData, signature, jwk);
  if (!sigValid) {
    return { valid: false, reason: 'invalid_signature' };
  }

  // 3. Validate claims (issuer, audience, expiry, nbf, owner identity)
  return validateAccessJwtClaims(
    claims,
    expectedIssuer,
    expectedAudience,
    expectedOwnerEmail,
    now,
  );
}

/**
 * Validates claims payload (used after signature verification).
 */
export function validateAccessJwtClaims(
  claims: CloudflareAccessJwtClaims,
  expectedIssuer: string,
  expectedAudience: string,
  expectedOwnerEmail: string,
  now: Date = new Date(),
): JwtValidationResult {
  // Validate expiration
  if (claims.exp * 1000 < now.getTime()) {
    return { valid: false, reason: 'expired' };
  }

  // Validate nbf (Not Before) if present
  if (claims.nbf && claims.nbf * 1000 > now.getTime()) {
    return { valid: false, reason: 'expired' }; // Not active yet
  }

  if (claims.iss !== expectedIssuer) {
    return { valid: false, reason: 'wrong_issuer' };
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expectedAudience)) {
    return { valid: false, reason: 'wrong_audience' };
  }

  if (claims.email !== expectedOwnerEmail) {
    return { valid: false, reason: 'owner_mismatch' };
  }

  return {
    valid: true,
    subject: claims.sub,
    email: claims.email,
    expiresAt: new Date(claims.exp * 1000),
  };
}

// ---------------------------------------------------------------------------
// Visibility policy & Authorization Context
// ---------------------------------------------------------------------------

export type AuthorizationAction =
  | 'read:private'
  | 'read:restricted'
  | 'read:public'
  | 'write:create'
  | 'write:update'
  | 'write:delete'
  | 'write:archive'
  | 'publish:approve'
  | 'publish:publish'
  | 'publish:unpublish'
  | 'export:request'
  | 'export:download'
  | 'integration:manage'
  | 'security:critical';

export function checkAuthorization(
  context: AuthorizationContext | null,
  action: AuthorizationAction,
  entityVisibility: Visibility,
  entityOwnerId: EntityId,
): AuthorizationResult {
  if (action === 'read:public' && entityVisibility === 'public') {
    return { authorized: true };
  }

  if (context === null) {
    return { authorized: false, reason: 'Authentication required.' };
  }

  if (context.expiresAt <= context.validatedAt) {
    return { authorized: false, reason: 'Authentication token has expired.' };
  }

  if (!context.isOwner) {
    return { authorized: false, reason: 'Access denied.' };
  }

  if (entityOwnerId !== context.ownerId) {
    return { authorized: false, reason: 'Access denied.' };
  }

  return { authorized: true };
}

export function requireOwnerContext(
  context: AuthorizationContext | null,
): AuthorizationResult {
  if (context === null) {
    return { authorized: false, reason: 'Authentication required.' };
  }
  if (!context.isOwner) {
    return { authorized: false, reason: 'Access denied.' };
  }
  return { authorized: true };
}

export function isContextValid(context: AuthorizationContext): boolean {
  return context.expiresAt > new Date();
}

export type { Visibility, EntityId };
