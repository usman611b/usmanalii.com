# ADR-001: Astro Static Rebuild vs. Cached Runtime Public Projection

**Status:** Decided  
**Date:** 2026-08-08  
**Deciders:** Implementation team  
**Depends on:** PRD v1.1, Technical Architecture §6

---

## Context

Public pages (Home, Journey, Skills, Projects, Activity, About, Recruiter mode, Deep-dive mode) must be served primarily as static assets per the Architecture objective: "Public traffic should be served primarily as static assets."

Two approaches exist:

**Option A — Static rebuild at publish time**  
When the owner publishes a record, a queue job triggers a Cloudflare Pages build (or incremental ISR-style revalidation). Public HTML is pre-rendered and served from the CDN edge.

**Option B — Cached runtime projection**  
Every public request hits a Cloudflare Worker that queries D1 with a short-lived cache (e.g. Cache API or KV). The Worker returns public-projection JSON/HTML.

## Decision

**Option A — Static rebuild at publish time.**

Rationale:
- "Public pages remain available when D1 is temporarily unavailable, using the last successful static build." (Architecture §24 acceptance criterion #1)
- Static delivery minimizes Worker invocations and cost (Architecture §22).
- Astro's static generation is the primary rendering mode.
- Incremental builds are triggered by the publication queue job (Architecture §6 publication pipeline step 5).

Dynamic routes (dashboard, preview, private APIs, search mutation) remain served by the Worker.

## Consequences

- Publication pipeline must trigger a build/revalidation after the D1 write succeeds.
- The last successful static build is retained as rollback.
- Failed builds must not retire the previous public version.
- Build-trigger mechanism (Cloudflare Pages Deploy Hook) is configured per environment — never in Git.

## Alternatives Considered

- Option B was rejected: it creates Worker cost on every public page view, reduces CDN hit rate, and makes availability depend on D1 uptime for ordinary public reads.
