# M4 Final Three-Gate Closure

## Canonical progression vocabulary

The runtime/domain vocabulary is now exactly: `exploring`, `practicing`, `applying`, `demonstrated`, `sustained`, `leadership`. Migration 012 safely maps values from the immutable legacy migration 002 (`observed`, `practiced`, `applied`, `delivered`, `sustained`, and the legacy default) into the canonical schema. Remaining repository search matches for legacy words are either this explicit migration mapping or unrelated prose such as “work delivered”; they are not active progression stages.

Domain, repositories, fixtures, tests, and public/dashboard UI examples use the canonical values. `graph-invariants.test.ts` covers valid stages and skip validation; the migration was also executed as part of a fresh 001–012 local D1 chain.

## Cursor security design

Traversal cursors are opaque base64url transport values, not cryptographically integrity-protected values. They carry no authorization decision. Decoding enforces the exact versioned schema, rejects unknown/missing fields, validates a safe integer offset in the range 0–10,000, limits encoded length and alphabet, and binds the cursor to `startNodeId`, `maxDepth`, `maxNodes`, and `maxEdges`. Tests reject malformed, out-of-bounds, and cross-context forged cursors.

## Scheduled reconciliation

Both Worker Wrangler configurations declare `crons = ["*/10 * * * *"]`. The Worker exports a real `scheduled()` handler, registers its promise through `ctx.waitUntil()`, and invokes `processReconciliationQueue()` with D1 and the artifacts/private R2 bucket.

The processor uses the actual M3 table, `artifact_reconciliation_queue`. It claims due rows with a per-run token and conditional status update, processes only rows owned by that token, makes completion idempotent, clears leases, applies bounded exponential retry/backoff, and moves exhausted work to `dead_letter`. `worker.test.ts` proves scheduled-handler invocation; `database.test.ts` covers success, retry/backoff, and dead-letter behavior.

## Verification results

- Typecheck: 14/14 packages passed.
- Affected tests: domain 37, evidence 12, fixtures 15, database 13, worker 21; all passed.
- Lint: 14/14 packages passed with zero warnings.
- Build: Worker dry-run and 33-page Astro build passed.
- Migration order: 001–012 passed.
- Fresh D1 execution: all 12 migrations executed successfully with Wrangler local D1.
- Secret scan: passed.

The parallel `pnpm test` invocation exhausted Windows child-process memory (`spawn UNKNOWN` / V8 OOM), so affected suites were rerun sequentially and passed. This is an environment concurrency failure, not a test assertion failure.

## Changed files

- Worker/scheduling: `apps/worker/src/index.ts`, `apps/worker/src/worker.test.ts`, `apps/worker/wrangler.toml`, `infrastructure/wrangler/wrangler.toml`.
- Canonical-stage UI: `apps/web/src/pages/capabilities/[slug].astro`, `apps/web/src/pages/capabilities/index.astro`, `apps/web/src/pages/dashboard/capabilities/index.astro`, `apps/web/src/pages/dashboard/graph/index.astro`.
- Domain/fixtures: `packages/domain/src/entities/index.ts`, `packages/domain/src/invariants.test.ts`, `packages/domain/src/rules/graph-invariants.ts`, `packages/domain/src/rules/graph-invariants.test.ts`, `packages/test-fixtures/src/index.ts`, `packages/test-fixtures/src/fixtures.test.ts`.
- Cursor: `packages/evidence/src/graph-traversal.ts`, `packages/evidence/src/evidence.test.ts`.
- Database/M3 migration repairs: `packages/database/migrations/001_initial.sql`, `packages/database/migrations/003_evidence_ledger.sql`, `packages/database/migrations/008_evidence_ledger_m3.sql`, `packages/database/migrations/012_m4_final_gate_closure.sql`, `packages/database/src/migrations/runner.ts`, `packages/database/src/repositories/capabilities.ts`, `packages/database/src/repositories/reconciliation.ts`, `packages/database/src/database.test.ts`.
- Migration tooling: `infrastructure/scripts/run-migrations.mjs`, `infrastructure/scripts/check-migration-order.mjs`, `infrastructure/scripts/verify-migrations.mjs`.
- Documentation: `docs/M4_FINAL_THREE_GATE_CLOSURE.md`, `docs/architecture/progression_rules.md`, `docs/architecture/traceability_matrix.md`, `docs/security/threat_model.md`.

No M5 work is included. The immutable commit hash is supplied with the closure delivery because a commit cannot contain its own hash.
