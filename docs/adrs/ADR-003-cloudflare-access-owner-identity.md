# ADR-003: Cloudflare Access Owner Identity Configuration

**Status:** Decided  
**Date:** 2026-08-08  
**Deciders:** Product Owner & Engineering  
**Depends on:** Security Threat Model §7, CRITICAL-01

---

## Context

Cloudflare Access protects `/dashboard/*` and private APIs by issuing signed JWT assertions (`Cf-Access-Jwt-Assertion`). To prevent unauthorized access or identity spoofing, the Worker must cryptographically verify the JWT signature and match the authenticated identity to the single authorized owner.

## Decision

1. **Owner Identity Storage:**  
   The single owner email address is stored as a Cloudflare Worker secret named `OWNER_EMAIL` (configured via `wrangler secret put OWNER_EMAIL` in production/staging and `.dev.vars` for local development). **`OWNER_EMAIL` is never committed to Git.**

2. **JWKS & Cryptographic Verification:**  
   The Worker fetches public RSA keys from `{CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, caches public keys with rotation support, and cryptographically verifies the RS256 signature via WebCrypto (`crypto.subtle.verify`).

3. **Claims Validation:**  
   - `iss` must match `CF_ACCESS_TEAM_DOMAIN`
   - `aud` must match `CF_ACCESS_AUD_TAG`
   - `exp` must be in the future
   - `email` must match secret `OWNER_EMAIL` exactly

## Consequences

- Anonymous or non-owner tokens are rejected with a stable 401/403 error without revealing entity existence.
- Local development requires `.dev.vars` containing local test secrets.
- Production deployment relies on Cloudflare Secret Store.