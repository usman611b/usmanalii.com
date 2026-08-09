# ADR-010: Error Reporting Provider and Privacy Settings

**Status:** Decided
**Date:** 2026-08-08
**Depends on:** Technical Architecture §19, Security §15

---

## Context

Error reporting requires balancing operational visibility with the privacy requirement that logs must not contain evidence bodies, private content, secrets or AI prompts.

## Decision

**V1: No third-party error reporting SDK.** Use structured logs to Cloudflare Logpush only.

Rationale:

- Third-party error SDKs (Sentry, etc.) add an external data-sharing surface that requires a privacy review.
- Cloudflare Logpush can be configured with field allowlists.
- V1 has no team to triage external error dashboards.
- Owner monitors through Cloudflare dashboard.

**Logging rules:**

- All log entries conform to SafeLogEntry from packages/observability.
- Fields: timestamp, level, environment, requestId, route (no private params), useCase, entityType, entityId (UUID only), durationMs, statusCode, errorCode, message.
- NEVER log: evidence bodies, content drafts, job descriptions, tokens, signed URLs, private filenames, AI prompts, full request payloads.

**Metrics:** Cloudflare Workers Analytics (built-in) for latency, error rates and invocation counts.

**Alerts:** Cloudflare Notifications for repeated failures, approaching free-tier limits and authorization anomalies.

## Reconsidering in V2

If error triage becomes difficult, a privacy-reviewed provider (e.g. self-hosted Sentry) may be introduced via an ADR amendment.
