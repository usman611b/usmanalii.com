# M4 Repository Integrity Closure

## Migration-history decision

Application of migrations `001`, `003`, and `008` to persistent or shared databases cannot be ruled out from repository evidence. They are therefore treated as previously applied. Their historical bytes and checksums were restored; corrections are executed through checksum-gated migration-runner compatibility handling and forward-only migration `012`. No pre-deployment rebaseline is claimed.

The decision, historical and transient hashes, compatibility rules, immutability boundary, and owner-approval requirement are recorded in [ADR-011](./adrs/ADR-011-migration-history-integrity.md). The immutable checksum baseline is `packages/database/migrations/manifest.json`.

## Documentation synchronization

`docs/traceability.md` now marks the completed M4 capabilities and claims as complete and links each item to implementation and test evidence.

The repository documentation search found no remaining pending-milestone or cryptographic-cursor claims. Remaining searched terms are valid only in these contexts:

- canonical legacy-stage conversion mappings in the M4 closure report;
- ordinary prose such as “measured vs observed,” “delivered only,” or “applied migration” that does not define progression stages;
- the actual `artifact_reconciliation_queue` table name and its implementation references.

## Complete test inventory

Exact command: `pnpm test:sequential`

| Project                |   Tests |
| ---------------------- | ------: |
| infrastructure-scripts |       3 |
| contracts              |       3 |
| design-system          |       5 |
| domain                 |      37 |
| observability          |       2 |
| web                    |       5 |
| authorization          |      23 |
| content                |      19 |
| evidence               |      12 |
| search                 |       0 |
| test-fixtures          |      15 |
| database               |      13 |
| worker                 |      21 |
| **Workspace total**    | **158** |

All 13 registered test-bearing projects executed sequentially. `search` has no registered test files and completed successfully. Result: 158 passed, 0 failed, 0 skipped.

Browser and axe-core command: `pnpm --dir apps/web exec playwright test --reporter=list`

Result: 23 passed, 0 failed, 0 skipped, using one worker. Combined automated total: 181 passed.

## Formatting

Generated Turbo caches, dependency directories, build output, coverage, Wrangler output, and Playwright artifacts are excluded in `.prettierignore`. `pnpm format:check` applies an incremental checksum baseline to legacy owned files while requiring every new or modified file to be formatted. Result: passed; 99 unchanged legacy files remain baselined.

## Final verification commands

All commands completed successfully:

```text
pnpm test:sequential
pnpm --dir apps/web exec playwright test --reporter=list
pnpm typecheck
pnpm lint
pnpm format:check
node infrastructure/scripts/verify-migrations.mjs
pnpm migrations:check
pnpm security:scan
pnpm security:audit
pnpm build
```

Fresh D1 creation applied all 12 migrations. Upgrade verification applied the historical `001`-`008` baseline and then upgraded through `012`. Migration order and all 12 immutable checksums passed. Secret scanning passed. The dependency audit reported no known vulnerabilities. The production web and worker builds passed.

The immutable closure commit hash and clean-working-tree confirmation are supplied in the final delivery because a commit cannot truthfully contain its own hash.
