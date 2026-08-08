import { describe, it, expect, vi } from 'vitest';
import {
  validateAccessJwtClaims,
  verifyAccessJwtCryptographically,
  checkAuthorization,
  requireOwnerContext,
  isContextValid,
  parseJwtParts,
  JwksKeyCache,
  type AuthorizationContext,
  type CloudflareAccessJwtClaims,
  type JwkKey,
  type JwksKeySet,
} from './index.js';
import type { EntityId } from '@usmanalii/domain';

const OWNER_ID = '00000000-0000-0000-0000-000000000001' as EntityId;
const OTHER_ID = '00000000-0000-0000-0000-000000000002' as EntityId;
const EXPECTED_ISSUER = 'https://team.cloudflareaccess.com';
const EXPECTED_AUDIENCE = 'test-audience-tag';
const OWNER_EMAIL = 'owner@usmanalii.com';

function makeValidClaims(overrides: Partial<CloudflareAccessJwtClaims> = {}): CloudflareAccessJwtClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'user-sub-123',
    email: OWNER_EMAIL,
    iss: EXPECTED_ISSUER,
    aud: EXPECTED_AUDIENCE,
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

function makeOwnerContext(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  const now = new Date();
  return {
    authenticatedSubject: 'user-sub-123',
    ownerId: OWNER_ID,
    isOwner: true,
    requestId: 'req-001',
    validatedAt: now,
    expiresAt: new Date(now.getTime() + 3_600_000),
    ...overrides,
  };
}

// Mock JWK for testing
const mockJwk: JwkKey = {
  kty: 'RSA',
  kid: 'test-key-id-1',
  use: 'sig',
  alg: 'RS256',
  n: 'u1W123',
  e: 'AQAB',
};

const mockJwks: JwksKeySet = {
  keys: [mockJwk],
};

// ---------------------------------------------------------------------------
// Cryptographic JWT & JWKS Key Cache Tests
// ---------------------------------------------------------------------------
describe('JwksKeyCache & Key Rotation', () => {
  it('retrieves cached key by kid', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJwks);
    const cache = new JwksKeyCache(fetcher);

    const key = await cache.getKey('test-key-id-1');
    expect(key).toEqual(mockJwk);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second call uses memory cache
    const keyCached = await cache.getKey('test-key-id-1');
    expect(keyCached).toEqual(mockJwk);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('triggers key rotation fetch if key ID is missing from cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJwks);
    const cache = new JwksKeyCache(fetcher);

    // First fetch populates cache with test-key-id-1
    await cache.getKey('test-key-id-1');

    // Requesting rotated key 'test-key-id-2' triggers second fetch
    const fetcher2 = vi.fn().mockResolvedValue({
      keys: [mockJwk, { ...mockJwk, kid: 'test-key-id-2' }],
    });
    const cache2 = new JwksKeyCache(fetcher2);
    await cache2.getKey('test-key-id-1');

    const rotatedKey = await cache2.getKey('test-key-id-2');
    expect(rotatedKey?.kid).toBe('test-key-id-2');
  });

  it('returns null if key is not found after fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJwks);
    const cache = new JwksKeyCache(fetcher);

    const key = await cache.getKey('non-existent-kid');
    expect(key).toBeNull();
  });
});

describe('parseJwtParts', () => {
  it('parses well-formed 3-part JWT strings', () => {
    // Header: {"kid":"test-key-id-1","alg":"RS256"} -> base64url: eyJraWQiOiJ0ZXN0LWtleS1pZC0xIiwiYWxnIjoiUlMyNTYifQ
    // Payload: {"sub":"123","email":"owner@usmanalii.com","iss":"https://team.cloudflareaccess.com","aud":"test-audience-tag","iat":1000,"exp":9999999999}
    const headerB64 = 'eyJraWQiOiJ0ZXN0LWtleS1pZC0xIiwiYWxnIjoiUlMyNTYifQ';
    const payloadB64 = 'eyJzdWIiOiIxMjMiLCJlbWFpbCI6Im93bmVyQHVzbWFuYWxpaS5jb20iLCJpc3MiOiJodHRwczovL3RlYW0uY2xvdWRmbGFyZWFjY2Vzcy5jb20iLCJhdWQiOiJ0ZXN0LWF1ZGllbmNlLXRhZyIsImlhdCI6MTAwMCwiZXhwIjo5OTk5OTk5OTk5fQ';
    const sigB64 = 'c2lnbmF0dXJl';
    const jwt = `${headerB64}.${payloadB64}.${sigB64}`;

    const parsed = parseJwtParts(jwt);
    expect(parsed).not.toBeNull();
    expect(parsed?.header.kid).toBe('test-key-id-1');
    expect(parsed?.claims.email).toBe('owner@usmanalii.com');
  });

  it('NEGATIVE: rejects malformed JWT string (less than 3 parts)', () => {
    expect(parseJwtParts('invalid.jwt')).toBeNull();
    expect(parseJwtParts('singlepart')).toBeNull();
  });
});

describe('verifyAccessJwtCryptographically — Cryptographic Gate', () => {
  it('NEGATIVE: rejects null or missing raw JWT token', async () => {
    const cache = new JwksKeyCache(async () => mockJwks);
    const result = await verifyAccessJwtCryptographically(
      null,
      cache,
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('missing');
  });

  it('NEGATIVE: rejects JWT with unknown kid (key_not_found)', async () => {
    const headerB64 = 'eyJraWQiOiJ1bmtub3duLWtpZCIsImFsZyI6IlJTMjU2In0';
    const payloadB64 = 'eyJzdWIiOiIxMjMifQ';
    const sigB64 = 'c2lnbmF0dXJl';
    const jwt = `${headerB64}.${payloadB64}.${sigB64}`;

    const cache = new JwksKeyCache(async () => mockJwks);
    const result = await verifyAccessJwtCryptographically(
      jwt,
      cache,
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('key_not_found');
  });

  it('NEGATIVE: rejects invalid signature (invalid_signature)', async () => {
    const headerB64 = 'eyJraWQiOiJ0ZXN0LWtleS1pZC0xIiwiYWxnIjoiUlMyNTYifQ';
    const payloadB64 = 'eyJzdWIiOiIxMjMiLCJlbWFpbCI6Im93bmVyQHVzbWFuYWxpaS5jb20iLCJpc3MiOiJodHRwczovL3RlYW0uY2xvdWRmbGFyZWFjY2Vzcy5jb20iLCJhdWQiOiJ0ZXN0LWF1ZGllbmNlLXRhZyIsImlhdCI6MTAwMCwiZXhwIjo5OTk5OTk5OTk5fQ';
    const invalidSigB64 = 'ZmFrZXNpZ25hdHVyZQ';
    const jwt = `${headerB64}.${payloadB64}.${invalidSigB64}`;

    const cache = new JwksKeyCache(async () => mockJwks);
    const result = await verifyAccessJwtCryptographically(
      jwt,
      cache,
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('invalid_signature');
  });
});

// ---------------------------------------------------------------------------
// CRITICAL-01: Claims Validation Tests
// ---------------------------------------------------------------------------
describe('validateAccessJwtClaims — CRITICAL-01 security tests', () => {
  it('accepts valid claims matching all requirements', () => {
    const result = validateAccessJwtClaims(
      makeValidClaims(),
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(true);
  });

  it('NEGATIVE: rejects expired token', () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    const result = validateAccessJwtClaims(
      makeValidClaims({ exp: past }),
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('expired');
  });

  it('NEGATIVE: rejects wrong issuer', () => {
    const result = validateAccessJwtClaims(
      makeValidClaims({ iss: 'https://attacker.example.com' }),
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('wrong_issuer');
  });

  it('NEGATIVE: rejects wrong audience', () => {
    const result = validateAccessJwtClaims(
      makeValidClaims({ aud: 'other-app-audience' }),
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('wrong_audience');
  });

  it('NEGATIVE: rejects different owner email (IDOR — cross-identity attempt)', () => {
    const result = validateAccessJwtClaims(
      makeValidClaims({ email: 'attacker@example.com' }),
      EXPECTED_ISSUER,
      EXPECTED_AUDIENCE,
      OWNER_EMAIL,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('owner_mismatch');
  });
});

// ---------------------------------------------------------------------------
// CRITICAL-02: Authorization & IDOR Tests
// ---------------------------------------------------------------------------
describe('checkAuthorization — CRITICAL-02 IDOR tests', () => {
  it('allows public read without auth context', () => {
    const result = checkAuthorization(null, 'read:public', 'public', OWNER_ID);
    expect(result.authorized).toBe(true);
  });

  it('NEGATIVE: denies public read for non-public entity without context', () => {
    const result = checkAuthorization(null, 'read:public', 'private', OWNER_ID);
    expect(result.authorized).toBe(false);
  });

  it('NEGATIVE: denies write without auth context (null)', () => {
    const result = checkAuthorization(null, 'write:create', 'private', OWNER_ID);
    expect(result.authorized).toBe(false);
  });

  it('allows owner to write their own entity', () => {
    const ctx = makeOwnerContext();
    const result = checkAuthorization(ctx, 'write:update', 'private', OWNER_ID);
    expect(result.authorized).toBe(true);
  });

  it('NEGATIVE: denies owner context accessing different entity owner (IDOR)', () => {
    const ctx = makeOwnerContext();
    const result = checkAuthorization(ctx, 'read:private', 'private', OTHER_ID);
    expect(result.authorized).toBe(false);
  });

  it('NEGATIVE: denies expired context', () => {
    const past = new Date(Date.now() - 1);
    const ctx = makeOwnerContext({ expiresAt: past, validatedAt: new Date() });
    const result = checkAuthorization(ctx, 'write:update', 'private', OWNER_ID);
    expect(result.authorized).toBe(false);
  });
});

describe('requireOwnerContext', () => {
  it('accepts valid owner context', () => {
    expect(requireOwnerContext(makeOwnerContext()).authorized).toBe(true);
  });

  it('NEGATIVE: rejects null context', () => {
    expect(requireOwnerContext(null).authorized).toBe(false);
  });

  it('NEGATIVE: rejects non-owner context', () => {
    expect(requireOwnerContext(makeOwnerContext({ isOwner: false })).authorized).toBe(false);
  });
});

describe('isContextValid', () => {
  it('returns true for non-expired context', () => {
    expect(isContextValid(makeOwnerContext())).toBe(true);
  });

  it('NEGATIVE: returns false for expired context', () => {
    const ctx = makeOwnerContext({ expiresAt: new Date(Date.now() - 1) });
    expect(isContextValid(ctx)).toBe(false);
  });
});
