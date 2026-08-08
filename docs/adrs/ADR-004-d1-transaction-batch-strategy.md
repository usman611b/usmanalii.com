# ADR-004: D1 Transaction and Batch Strategy for Approvals and Publishing

**Status:** Decided
**Date:** 2026-08-08
**Depends on:** Technical Architecture §11, Database Model §4

---

## Context

D1 (Cloudflare's SQLite) does not support traditional multi-statement transactions through the REST API binding in the same way as PostgreSQL. The D1 binding provides db.batch() for executing multiple statements atomically.

## Decision

Use **D1 db.batch()** for multi-statement atomic operations:
- Approval operations (update entity + create audit event)
- Publication operations (update state + create revision + write public projection + create audit event)
- Evidence edge creation (create link + update version_no + create audit event)

For complex publish sequences that cannot be expressed as a single batch:
1. Write canonical state first with state = 'publishing_in_progress'
2. Execute side effects (projection generation via queue)
3. Update to state = 'published' in final batch
4. On failure: revert to state = 'approved' and log audit event

Idempotency key prevents double-publish.

## Consequences

- All multi-entity writes use db.batch()
- Audit events are part of the same batch as the mutation
- Publish is idempotent when given the same idempotency key
- Failed publishes leave canonical data intact with previous state