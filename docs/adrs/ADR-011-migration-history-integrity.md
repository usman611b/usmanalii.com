# ADR-011: Migration History Integrity and Compatibility Execution

## Status

Accepted for M4 repository-integrity closure. Persistent/shared application of migrations 001, 003, and 008 cannot be ruled out because repository evidence cannot establish whether manual Cloudflare or backup-database operations occurred.

## Decision

Treat migrations 001, 003, and 008 as previously applied. Their historical contents from commit `eb86fc7` are restored byte-for-byte and recorded in `packages/database/migrations/manifest.json`. No pre-deployment rebaseline is claimed.

Known defects are handled by checksum-gated migration-runner compatibility transformations:

- `001_initial.sql`: D1 execution omits the historical `PRAGMA journal_mode = WAL;`; the immutable source remains unchanged.
- `003_evidence_ledger.sql`: D1 execution relocates `evidence_link_single_target` after the column declarations; the immutable source remains unchanged.
- Before `009_evidence_constraints_m3.sql`: compatibility execution adds `evidence_items.deleted_at` and its index because historical migration 008 did not create the column required by migration 009.
- Migration 012 remains the forward-only M4 schema correction for canonical maturity values and reconciliation claiming.

Compatibility transformations run only after the source file matches its approved SHA-256 manifest entry. Unknown content is rejected as drift rather than transformed.

## Historical and transient hashes

| Migration                    | Restored historical SHA-256                                        | Transient hash in commit `1e38e0b`                                 |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `001_initial.sql`            | `ee4e5ab83eebd18bef109e0a1cd60621775582bc84f6d1ef2d99568b7bc3aca4` | `08a01c7841e5e3840a8c22496e7aa78d5348b5a620029c393834640f1c16ab44` |
| `003_evidence_ledger.sql`    | `3f334a6f8f366a2abe6265ea1f2e26f8e7926759c6ba5838780a3c6bd4105539` | `174114dafbd0de1207e19d611757ce9ce480d4a5a8379e43a15b56286d925a68` |
| `008_evidence_ledger_m3.sql` | `d6e6d0c166eb14aa37fe1f191dd882ff6dcff0b029b8bc2de680a03c02d5e40e` | `92f43e0dd71aba5ca5d915de2e15eced8791f6c8f5f723a929ff47b0b95f4fc6` |

## Verification failure cause

The previous `verify-migrations.mjs` inspected file presence and selected SQL strings but did not execute the migrations. Repository tests used mocks and therefore did not exercise SQLite parsing or D1 authorization restrictions. The replacement verifier executes checksum-approved compatibility SQL against fresh local D1 and an M3 upgrade baseline.

## Immutability and approval

The manifest baseline becomes immutable with the repository-integrity closure commit. Any subsequent migration edit requires explicit owner approval, an ADR, a manifest change, and proof that no applied database will drift. Normal schema evolution must append a new numbered migration.

## Consequences

- Historical source identity is preserved.
- Fresh D1 creation remains deterministic through documented compatibility execution.
- The legitimate M3 baseline upgrades through migration 012.
- Checksum drift fails CI and cannot be silently accepted.
