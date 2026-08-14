# M7.5 Cloudflare Staging Configuration Closure

## Outcome

M7.5 first closed as a configuration-only milestone. The repository established an explicit,
production-safe Cloudflare staging path for `staging.usmanalii.com` before any remote mutation.
The owner subsequently authorized the staging deployment on 2026-08-12. Its executed state and
verification evidence are recorded in `docs/M7_5_STAGING_DEPLOYMENT_CLOSURE.md`.

## Environment boundaries

| Environment | Worker route                  | D1                        | R2                            | GitHub schedule           |
| ----------- | ----------------------------- | ------------------------- | ----------------------------- | ------------------------- |
| Local       | localhost only                | local persistence         | local persistence             | disabled                  |
| Preview     | no custom route               | preview placeholders      | preview placeholders          | disabled                  |
| Staging     | `staging.usmanalii.com/api/*` | `usmanalii-staging`       | `usmanalii-artifacts-staging` | manual only               |
| Production  | `usmanalii.com/api/*`         | production resources only | production resources only     | once daily at `00:00 UTC` |

The staging R2 names `ARTIFACTS_BUCKET`, `R2_PRIVATE`, and `R2_PUBLIC` are compatibility aliases
for the same private bucket. Delivery remains Worker-mediated; no public R2 URL is enabled.

## Implemented files

- `apps/worker/wrangler.toml` — explicit local, preview, staging, and production environments.
- `infrastructure/wrangler/wrangler.toml` — synchronized infrastructure definition.
- `infrastructure/wrangler/wrangler.staging.toml.example` — safe ignored staging template.
- `.gitignore` — excludes real staging/production overrides while retaining examples.
- `infrastructure/scripts/verify-cloudflare-config.mjs` — environment-boundary validation.
- `infrastructure/scripts/apply-remote-staging-migrations.mjs` — plan-first, checksum-gated,
  staging-only migration executor.
- `infrastructure/scripts/run-workspace-tests-sequential.mjs` — deterministic Windows-safe test
  execution.
- `package.json` — configuration validation, migration-plan, and sequential-test commands.
- `docs/M7_5_STAGING_DEPLOYMENT_GUIDE.md` — deployment, Access, secret, migration, and smoke-test
  runbook.
- `apps/web/src/pages/journey.astro`, `apps/web/src/pages/capabilities/index.astro`,
  `apps/web/src/components/SkillsEvidenceGraph.tsx`, and `apps/web/e2e/accessibility.spec.ts` —
  narrow semantic and graph-accessibility corrections found by the full browser gate.

## Verification evidence

| Gate                                         | Result                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| Cloudflare configuration validator           | passed                                                      |
| Exact staging Worker dry-run                 | passed; staging D1/R2 bindings only                         |
| Staging migration plan                       | passed; 17 checksum-approved migrations; no remote mutation |
| Sequential workspace tests                   | 327 passed, 0 failed, 0 skipped                             |
| Playwright and axe-core                      | 50 passed with one worker; 0 automated axe violations       |
| TypeScript                                   | 14/14 workspaces passed; 0 errors                           |
| ESLint                                       | 14/14 workspaces passed; 0 errors or warnings               |
| Formatting                                   | passed                                                      |
| Migration order and manifest                 | all 17 passed                                               |
| Fresh and historical-upgrade D1 verification | passed                                                      |
| Secret scan                                  | passed; 0 findings                                          |
| Dependency audit                             | passed; no known vulnerabilities                            |
| Production build                             | passed                                                      |
| `git diff --check`                           | passed                                                      |

The M7 closure report recorded 274 workspace tests. The current working set contains additional
post-M7 real-data integration tests, so the verified total is now 327. Browser coverage remains
50 tests. M7.5 did not delete route files or deploy fixture data.

## Manual values required at configuration closure

Before staging deployment, the owner was required to enter:

1. the D1 UUID for `usmanalii-staging` in the ignored
   `infrastructure/wrangler/wrangler.staging.toml` file;
2. the exact owner email used by the Cloudflare Access Allow policy;
3. the Access application AUD tag;
4. a fine-grained read-only GitHub token;
5. a unique random staging preview secret of at least 32 bytes.

`CF_ACCESS_TEAM_DOMAIN` is already known and must be entered as
`https://falling-field-38c5.cloudflareaccess.com`. `LOCAL_OWNER_TOKEN` must never be entered in
Cloudflare.

## Deployment authorization history

Deployment remained a separate action until the owner explicitly authorized it. The ignored local
configuration now contains the real staging D1 identifier and remains excluded from Git. It must
never be copied into tracked configuration or documentation. See
`docs/M7_5_STAGING_DEPLOYMENT_CLOSURE.md` for the completed deployment record.
