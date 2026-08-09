# M5 Final Verification Closure

## Final implementation state

- Project revision authority is `project_revisions.canonical_body_json`.
- `body_format = 'json_blocks'`; integer `body_schema_version = 1` represents ADR-005 `v1`.
- `markdown_export` is generated from canonical JSON and is never authoritative.
- Credentials in project URLs are rejected; they are not stripped and accepted.
- The server does not fetch project URLs. The control is public-link validation, not network-level SSRF protection.
- Project, contribution, evidence, artifact, skill, capability, experiment, ADR, debugging lesson, deployment, version, journal link, related-project, relationship, and external-URL serialization passes through centralized eligibility and private-field removal.
- Supported project creation cannot mass-assign `owner_id`, publication, visibility, contribution approval, or verification state.
- No supported application write accepts an unredacted original.
- Automated accessibility results do not certify complete WCAG conformance. Manual review remains required.

## Migration 015

Migration 015 SHA-256: `a8e36e7b4d985285bb996619a14503650ff0cecf6e5ca09cba8a2a6eca40331a`

Manifest SHA-256: `bbb5772531fafd5b8731be9beef020aef1126dc6d54b7dc7070c50d4f26b67fa`

The executable D1 verifier proves:

- valid legacy JSON arrays are copied into `canonical_body_json`;
- empty, malformed, non-JSON, and non-array snapshots fail closed to `[]` while the private legacy snapshot remains available for review;
- existing non-null `sensitive_original_text` values produce a cleanup event containing no secret value and are irreversibly cleared;
- a normal project update succeeds after cleanup;
- new non-null sensitive-original inserts and updates are rejected by database triggers;
- revision updates and deletes are rejected, while rollback appends a new revision.

Fresh execution applied migrations 001–015. Upgrade execution applied the immutable M4 baseline 001–012 followed by M5 migrations 013–015. Migration order and all 15 manifest checksums passed.

## Final test inventory

Command: `pnpm test:sequential`

| Project                |   Tests | Failures | Skips |
| ---------------------- | ------: | -------: | ----: |
| infrastructure-scripts |       8 |        0 |     0 |
| contracts              |       6 |        0 |     0 |
| design-system          |       5 |        0 |     0 |
| domain                 |      66 |        0 |     0 |
| observability          |       2 |        0 |     0 |
| web                    |       5 |        0 |     0 |
| authorization          |      23 |        0 |     0 |
| content                |      40 |        0 |     0 |
| evidence               |      12 |        0 |     0 |
| search                 |       5 |        0 |     0 |
| test-fixtures          |      15 |        0 |     0 |
| database               |      29 |        0 |     0 |
| worker                 |      28 |        0 |     0 |
| **Total**              | **244** |    **0** | **0** |

Browser command: `pnpm --dir apps/web exec playwright test --workers=1 --reporter=line`

Browser result: 31 passed, 0 failed, 0 skipped. Axe reported 0 automated violations under the configured rules. Keyboard tests passed; reduced-motion verification passed in the web unit suite. Manual accessibility review remains required.

## Final pipeline

The final tree passed:

```text
pnpm test:sequential
pnpm --dir apps/web exec playwright test --workers=1 --reporter=line
pnpm typecheck
pnpm lint
pnpm format:check
pnpm migrations:check
node infrastructure/scripts/verify-migrations.mjs
pnpm security:scan
pnpm audit
pnpm build
```

The dependency audit used no severity threshold and reported no known vulnerabilities. The production build generated 57 Astro pages and completed the Worker dry-run.

## Files changed since `763d929b0c586083117f7598063000ff30982abc`

1. `apps/web/src/pages/dashboard/projects/[id]/case-study.astro`
2. `apps/worker/src/m5-closure-security.test.ts`
3. `apps/worker/src/routes/private.ts`
4. `apps/worker/src/routes/public.ts`
5. `apps/worker/src/worker.test.ts`
6. `docs/M5_ADVERSARIAL_REQUIREMENT_TEST_MATRIX.md`
7. `docs/M5_VERIFICATION_GATE_CLOSURE_WALKTHROUGH.md`
8. `docs/adrs/ADR-012-m5-project-revision-storage.md`
9. `infrastructure/scripts/check-migration-order.mjs`
10. `infrastructure/scripts/migration-integrity.test.mjs`
11. `infrastructure/scripts/package.json`
12. `infrastructure/scripts/sensitive-original-boundary.test.mjs`
13. `infrastructure/scripts/verify-migrations.mjs`
14. `packages/content/src/project-canonical-storage.test.ts`
15. `packages/database/migrations/015_m5_integrity_closure.sql`
16. `packages/database/migrations/manifest.json`
17. `packages/database/src/database.test.ts`
18. `packages/database/src/migrations/runner.ts`
19. `packages/database/src/repositories/project-relationships.ts`
20. `packages/database/src/repositories/projects.ts`
21. `packages/domain/src/entities/index.ts`
22. `packages/domain/src/rules/project-rules.test.ts`
23. `packages/domain/src/rules/project-rules.ts`
24. `packages/evidence/src/provenance.ts`
25. `packages/search/src/index.ts`
26. `packages/search/src/search.test.ts`
27. `pnpm-lock.yaml`

## Known limitations

- The D1 verification is local Wrangler execution; no claim is made that a remote preview, staging, or production database was migrated.
- The legacy sensitive column remains physically present for schema compatibility, but migration 015 clears historical values and triggers reject every new non-null write.
- Project URLs are display-only. Because the server does not fetch them, DNS resolution and redirect-destination validation are outside the current control boundary.
- Axe, keyboard, and reduced-motion automation cannot replace manual accessibility assessment.

The immutable closure commit hash and clean-tree confirmation are supplied at delivery because a commit cannot contain its own hash.
