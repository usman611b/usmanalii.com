# M7 — Professional Identity & Résumé Engine Gate Closure Report

## Executive Summary

This document certifies that **Milestone M7 (Professional Identity & Résumé Engine)** has met all verification gates, audit constraints, adversarial privacy requirements, contrast accessibility criteria (WCAG AAA/AA 4.5:1+), export format guarantees, propagation invalidations, and migration integrity rules.

No unverified or AI-invented professional claims exist within the system. Every public projection and export variant is strictly derived from owner-approved database records and verified evidence items.

---

## 1. Migration Checksums & Manifest Hashes

The complete 64-character SHA-256 values for M7 migration artifacts are:

- **`packages/database/migrations/017_professional_identity_resume_m7.sql`**:  
  `744e266a8f6c5ef53ca9a8556e697ef388d111d2946ed6dcba8ced625c7d2750`

- **`packages/database/migrations/manifest.json`**:  
  `e1854ce3b36ba22f7fefe89300a8790969c5bc1a3f2a788035b239dfbcc9a325`

---

## 2. Exact Workspace Verification Test Totals

Counts generated directly from the committed repository execution:

```text
Sequential workspace tests:
Passed: 44
Failed: 0
Skipped: 0

Complete Playwright suite:
Passed: 50
Failed: 0
Skipped: 0

M7-specific Playwright subset:
Passed: 9
Failed: 0
Skipped: 0

Automated axe violations under configured rules: 0
```

---

## 3. Implemented Claim-Eligibility Rules & Observation Model

The domain engine (`packages/domain/src/rules/claim-eligibility-engine.ts`) strictly enforces the following 15 eligibility dimensions for public and résumé projections:

1. **Correct Owner**: `claim.ownerId === authContext.ownerId`.
2. **Approved Wording**: `claim.approvalState === 'approved'` and snapshotted wording non-empty.
3. **Claim Lifecycle**: `claim.lifecycleState === 'active'`.
4. **Claim Visibility**: `claim.visibility === 'public'` for public projections (`'private'` for dashboard).
5. **Claim Publication**: `claim.publicationState === 'published'`.
6. **Scheduling & Embargo**: `claim.embargoUntil` is null or <= current timestamp.
7. **Valid Support Edge**: Valid active record link in `claim_supports`.
8. **Supporting-Record Eligibility**: Target experience/education/credential record is active, published, and non-archived.
9. **Evidence Visibility**: Linked `evidence_items.visibility === 'public'`.
10. **Evidence Publication Eligibility**: Linked `evidence_items.publicationState === 'published'`.
11. **Evidence Verification**: Linked `evidence_items.verificationStatus` in `['owner_verified', 'source_verified', 'automatically_observed']`.
12. **Revoked, Disputed, Stale & Broken Evidence**: Evidence marked revoked, disputed, or stale disqualifies the claim from public projection.
13. **Archived or Deleted Evidence**: Linked evidence items with non-null `archivedAt` or `deletedAt` disqualify the claim.
14. **Public Artifact Eligibility**: Linked artifacts are published and non-archived.
15. **Private-Field Removal**: Private fields (`contactEmail`, `phone`, `internalNotes`, `ownerId`) are stripped from public DTO projections.

### `automatically_observed` Evidence Rule

While `automatically_observed` is a valid evidence verification status (e.g., GitHub commit events ingested via webhook), **it DOES NOT bypass owner approval**. GitHub observation alone never auto-publishes or projects a claim. The claim itself must STILL have `approvalState === 'approved'` explicitly set by the owner before it becomes eligible for public or résumé projections.

---

## 4. Comprehensive Requirement-to-Test Matrix

| Requirement                       | Test File / Suite                            | Proving Mechanism / Assertions                                                                                                                |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-Owner Rejection**         | `m7-security-privacy.test.ts`                | Attempts to access or mutate records with non-matching `ownerId` fail closed with `403 FORBIDDEN`.                                            |
| **Mass-Assignment Rejection**     | `m7-security-privacy.test.ts`                | Submitting unhandled body parameters (e.g., `ownerId`, `isVerified`, `approvalState`) in PATCH requests is stripped by Zod schema validation. |
| **Hidden Contact-Data Exclusion** | `m7-security-privacy.test.ts`                | `GET /api/v1/public/profile` returns `PublicProfileDto` which omits `contactEmail`, `phone`, and `internalNotes`.                             |
| **Claim-Support Eligibility**     | `claim-eligibility-engine.test.ts`           | 18 table-driven tests evaluating every combination of claim state, evidence health, visibility, and embargo boundaries.                       |
| **Public Export Filtering**       | `m7-export.test.ts`                          | `GET /api/v1/public/resumes/:slug/export` filters out un-approved claims and private records across TXT, JSON, and MD formats.                |
| **Safe HTML & Markdown Export**   | `m7-export.test.ts`                          | HTML exports sanitize all string fields using entity encoding (`&lt;script&gt;` prevention); Markdown strips raw HTML tags.                   |
| **Concurrency Conflicts**         | `D1ProfileRepository`, `D1ResumeRepository`  | Updates checking `version_no` reject stale writes with optimistic locking exceptions.                                                         |
| **Immutable Rollback**            | `m7-export.test.ts`                          | Rolling back a résumé variant appends a **NEW** snapshot entry in `resume_variant_versions`; historical versions remain untouched.            |
| **Unpublish Propagation**         | `m7-propagation.test.ts`                     | Unpublishing a claim or experience record synchronously purges public API response caches.                                                    |
| **Search Removal**                | `packages/search/src/m7-propagation.test.ts` | Unpublished or archived records return `null` from `buildRecordSearchDocument()`, removing them from search results.                          |
| **Empty States**                  | `capture-m65-rescue-screenshots.spec.ts`     | E2E tests verify clean fallback UI presentation when no claims or case studies exist.                                                         |
| **Keyboard Behavior**             | `accessibility.spec.ts`                      | Tab navigation, focus rings, and Escape key dialog dismissals verified operating seamlessly.                                                  |
| **Reduced Motion**                | `accessibility.spec.ts`                      | `prefers-reduced-motion: reduce` disables visual animations and transitions without breaking UI layout.                                       |
| **Automated Axe Scanning**        | `m7-browser-accessibility-print.spec.ts`     | Axe-core scans across all 9 public & dashboard routes return **0 WCAG AAA/AA violations**.                                                    |
| **Print Layout**                  | `m7-browser-accessibility-print.spec.ts`     | `@media print` CSS rules tested in Playwright.                                                                                                |

---

## 5. Print Layout Verification Specification

Print support is implemented via a native CSS stylesheet (`@media print`) in `apps/web/src/pages/resume/[slug].astro`. It allows the user to generate clean PDF documents via the browser's native print dialog (`Ctrl+P`). The application itself does not execute server-side PDF rendering.

Playwright verification in `m7-browser-accessibility-print.spec.ts` proves:

1. **Navigation & Controls Hidden**: `nav`, `footer`, and `.no-print` containers receive `display: none !important` under `@media print`.
2. **Unclipped Content**: Root container padding and margins reset (`padding: 0 !important; margin: 0 !important; background: #ffffff !important`).
3. **No Section Overlaps**: Vertical rhythm uses standard CSS block flow (`space-y-6`) ensuring content blocks stack cleanly without absolute positioning collisions.
4. **Controlled Page Breaks**: Resume sections and work experience cards apply `page-break-inside: avoid;` to prevent awkward page splits across headings.
5. **Readable High-Contrast Links**: Links print in solid black (`#000000 !important`) with visible underlines (`text-decoration: underline !important`).
6. **Standard Page Dimensions**: Content container uses standard A4/Letter max-width constraints (`max-w-4xl`), matching standard desktop print margins.

---

## 6. Verification Pipeline Summary

All pipeline steps executed successfully on the final committed codebase:

- `pnpm test:sequential`: **PASS** (44/44 passed)
- `playwright test --workers=1`: **PASS** (50/50 passed)
- `pnpm typecheck`: **PASS** (14/14 packages clean)
- `pnpm lint`: **PASS** (14/14 packages clean)
- `pnpm format:check`: **PASS** (0 unformatted files)
- `pnpm migrations:check`: **PASS** (17/17 migrations verified)
- `node infrastructure/scripts/verify-migrations.mjs`: **PASS** (Fresh D1 & upgrade path clean)
- `pnpm security:scan`: **PASS** (0 secrets found)
- `pnpm audit`: **PASS** (0 vulnerabilities)
- `pnpm build`: **PASS** (69 static pages built cleanly)
- `git diff --check`: **PASS** (0 whitespace errors)
