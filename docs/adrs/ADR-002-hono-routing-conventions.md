# ADR-002: Hono Routing and API Contract Conventions

**Status:** Decided
**Date:** 2026-08-08
**Depends on:** Technical Architecture §8, §9

---

## Context

The Worker API needs a typed HTTP routing framework. The Technical Architecture §2 specifies "Cloudflare Worker with Hono-style typed routing."

## Decision

Use **Hono v4** for typed routing with the following conventions:

- API prefix: /api/v1/
- Zod-validated request and response schemas via @hono/zod-validator
- Stable machine error codes (see contracts package ErrorCodeSchema)
- Request ID generated per request and returned in X-Request-Id header
- Cursor pagination for all list endpoints (no offset pagination)
- Idempotency key (Idempotency-Key header) for imports, approvals and publish actions
- Optimistic concurrency via ersion_no for mutable records
- JSON error responses never include stack traces or entity-existence information

## Consequences

- All routes defined in typed Hono pp instance
- Middleware stack: auth → authorization → rate-limit → use-case → audit
- Route handlers are thin — business logic lives in domain/use-case layer
- Error factory maps domain errors to stable HTTP error codes

## Alternatives Considered

- itty-router: lacks native TypeScript inference
- Raw Request/Response: no middleware composability
