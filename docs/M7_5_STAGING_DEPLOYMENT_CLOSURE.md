# M7.5 Cloudflare Staging Deployment Closure

## Outcome

The owner-authorized staging deployment completed on 2026-08-12. The public frontend, API Worker,
staging D1 database, private R2 bucket, Cloudflare Access application, and custom staging hostname
are operational. Production was not deployed or modified.

## Production safety boundary

- Only `staging.usmanalii.com` received a new proxied CNAME.
- The apex, `www`, mail, verification, and other live DNS records were not changed.
- The Worker route is limited to `staging.usmanalii.com/api/*`.
- The Pages project is `usmanalii-web-staging`.
- The Worker is `usmanalii-worker-staging`.
- D1 uses `usmanalii-staging`; its private identifier remains only in an ignored local override.
- R2 uses `usmanalii-artifacts-staging`; no public bucket URL is enabled.
- Staging has no scheduled GitHub synchronization. Production remains configured for at most once
  daily and was not deployed.

## Executed deployment

| Component            | Result                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| D1 migrations        | 17 checksum-approved migrations applied; remote schema version range 1-17  |
| Pages deployment     | 70 files deployed to `usmanalii-web-staging`                               |
| Pages deployment URL | `https://b94f9256.usmanalii-web-staging.pages.dev`                         |
| Custom hostname      | `https://staging.usmanalii.com` active with active certificate validation  |
| Worker deployment    | `usmanalii-worker-staging`, version `afa03c54-a1f3-4c7e-b09b-e8ce250dd48b` |
| Worker route         | `staging.usmanalii.com/api/*`                                              |
| Encrypted secrets    | all five required names present; values were never printed or committed    |

The encrypted secret names are `OWNER_EMAIL`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD_TAG`,
`GITHUB_TOKEN`, and `PREVIEW_SECRET`. `LOCAL_OWNER_TOKEN` is absent.

## Signed-out smoke tests

| Request                                               | Expected boundary                     | Result |
| ----------------------------------------------------- | ------------------------------------- | ------ |
| `GET /`                                               | public HTML                           | 200    |
| `GET /api/v1/public/health`                           | public JSON                           | 200    |
| `GET /api/v1/public/profile`                          | public JSON                           | 200    |
| `GET /api/v1/public/journey`                          | public JSON                           | 200    |
| `GET /api/v1/public/projects`                         | public JSON                           | 200    |
| `GET /api/v1/public/skills`                           | public JSON                           | 200    |
| `GET /api/v1/public/graph/visualization`              | public JSON                           | 200    |
| `GET /api/v1/public/activity?timezone=Asia%2FKarachi` | public JSON                           | 200    |
| `GET /dashboard`                                      | Cloudflare Access login               | 302    |
| `GET /api/v1/private/dashboard/summary`               | Cloudflare Access login               | 302    |
| `POST /api/v1/local-auth/session`                     | unavailable outside local development | 404    |

The owner completed an authenticated Cloudflare Access browser smoke test. The dashboard and
private API loaded successfully, and the GitHub integration connected after correcting the native
Cloudflare `fetch` receiver binding. The localhost-only login action is hidden outside localhost and
its staging route redirects to the Access-protected dashboard.

The GitHub fix is protected by a regression test that reproduces the runtime's branded `fetch`
receiver requirement. Focused post-fix verification passed with 26 evidence tests and 46 Worker
tests. Staging Worker version `f63daa29-4263-47ed-b0bd-b4921ccb7c7f` contains the correction.

## Final repository verification

| Gate                                             | Result                                                |
| ------------------------------------------------ | ----------------------------------------------------- |
| Sequential workspace tests                       | 327 passed, 0 failed, 0 skipped                       |
| Playwright and axe-core                          | 50 passed with one worker; 0 automated axe violations |
| TypeScript                                       | 14/14 workspaces passed                               |
| ESLint                                           | 14/14 workspaces passed with zero warnings            |
| Formatting                                       | passed; zero legacy files baselined                   |
| Cloudflare configuration isolation               | passed                                                |
| Migration checksums and order                    | all 17 passed                                         |
| Fresh and historical-upgrade migration execution | passed                                                |
| Secret scan                                      | passed; zero findings                                 |
| Dependency audit                                 | no known vulnerabilities                              |
| Production build                                 | passed; 51 static pages and Worker dry run            |
| `git diff --check`                               | passed                                                |

The build still reports two pre-existing non-blocking frontend warnings: Shiki's inline syntax
highlighting styles conflict with strict CSP guidance, and the Google Fonts `@import` is emitted
after other CSS rules. These should be corrected during the dedicated UI hardening milestone.

## Credential cleanup

The temporary Cloudflare deployment API token must be deleted from Cloudflare after the final
owner-authenticated smoke test. Its Windows user environment variable must also be removed. Token
values, owner identity values, Access audience values, preview secrets, GitHub credentials, and D1
identifiers are intentionally absent from this report.

## Repository state

No commit was created. The working tree already contained substantial owner and prior-agent work;
those unrelated changes were preserved without reset, checkout, staging, or cleanup.
