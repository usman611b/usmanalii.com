# ADR-006: R2 Public/Private Object Delivery

**Status:** Decided
**Date:** 2026-08-08
**Depends on:** Technical Architecture §12, Security §10, CRITICAL-03

---

## Context

R2 buckets can be configured as public (direct URL access) or private (Worker-mediated). CRITICAL-03 states: "Public buckets, predictable object keys or long-lived signed URLs could expose private artifacts."

## Decision

**All R2 buckets are private by default.** No R2 bucket has public access enabled.

Object delivery model:
- **Private originals**: Delivered only through authenticated Worker streaming response
- **Public derivatives**: Optimized/resized images created from originals; served via short-lived signed URL (max 15 minutes) or Worker stream
- **Temporary uploads**: Quarantine prefix; accessed only during processing
- **Generated exports**: Short-lived signed URL (max 1 hour); single-use; logged

Object key format: {ownerId}/{entityType}/{random-uuid}.{ext} — randomized, not guessable.

## Consequences

- No public R2 URLs ever returned in public API responses
- Signed URL generation logged as audit event (URL itself not logged)
- Export links expire and are audited
- Workers bindings are the only access path to private data