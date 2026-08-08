# Public Eligibility and Privacy Specification

This document specifies the public eligibility constraints for skills, capabilities, evidence, and graph projections.

---

## 1. Public Eligibility Invariants

A record is eligible for public display **only** when all of the following conditions are met simultaneously:

1. **Visibility**: Record `visibility` is set to `'public'`.
2. **Lifecycle State**: Record is in a publishable state (`'active'` or `'published'`).
3. **Owner Confirmation**: Record is confirmed and approved by the owner.
4. **No Future Schedule**: `scheduled_for` is `NULL` or `<= NOW`.
5. **No Active Embargo**: `embargo_until` is `NULL` or `<= NOW`.
6. **Supporting Proof**: Associated with at least one eligible public evidence item.
7. **Public Relationships**: Edge connections connect only to other public, approved entities.

---

## 2. Opaque 404 Behavior & Instant Redaction

- If any element becomes private, archived, soft-deleted, disputed, revoked, scheduled, or embargoed, the record immediately becomes inaccessible to anonymous public requests.
- All ineligible public detail API routes return an opaque `404 RESOURCE_NOT_FOUND` error to prevent resource enumeration or privacy leak side-channels.
