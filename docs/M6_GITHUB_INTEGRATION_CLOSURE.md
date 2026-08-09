# M6 GitHub Integration Closure

## Milestone outcome

M6 provides owner-authenticated, read-only GitHub evidence ingestion with stable attribution, bounded API synchronization, review-before-acceptance, owner-scoped repository/project linking, and privacy-safe activity projections. Candidate acceptance remains an explicit owner action. M7 has not begun.

## Requirement-to-implementation matrix

| Area                | Final implementation                                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attribution         | `packages/domain/src/rules/github-rules.ts` prioritizes stable numeric user IDs, then approved emails, then login fallback; it distinguishes author, committer, co-author, verified bot, web-flow, and ambiguous cases.                                                       |
| GitHub client       | `packages/evidence/src/github-client.ts` provides token-required read-only requests, ETag/304 handling, primary-limit parsing, 403/429 Retry-After handling, three-attempt retry bounds, timeout cancellation, secret redaction, and pagination link parsing.                 |
| Synchronization     | `packages/evidence/src/github-sync-service.ts` bounds discovery to five pages and repository imports to 30 commits and 10 releases, isolates partial failures, stops on low primary limits, and uses an abstract repository port.                                             |
| Concurrency         | `packages/database/src/repositories/github.ts` uses an atomic owner-scoped D1 update to claim work, permits takeover after five minutes, and records `synced`, `error`, or `access_revoked` completion.                                                                       |
| Candidate integrity | D1 fingerprint uniqueness deduplicates candidates; accepted/edited owner fields are not overwritten by later upstream refreshes; upstream privacy continues to update. Acceptance and optional project linking execute in one D1 batch.                                       |
| Security            | `apps/worker/src/routes/github.ts` uses authenticated owner context for every query. Mutation routes inherit CSRF enforcement. Client-supplied ownership and approval fields are ignored, foreign resources return opaque not-found responses, and tokens are never returned. |
| Activity            | `computeActivityHeatmap` deduplicates event IDs, applies timezone boundaries, excludes future/private/unpublished activity, and masks public counts and event types.                                                                                                          |
| UI                  | The dashboard integration supports identity, repository selection, synchronization, candidate review, and accessible status feedback. The activity heatmap has a semantic alternative presentation.                                                                           |

## Requirement-to-test matrix

| Requirement                      | Registered test name                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable numeric ID                | `1. Numeric user-ID match (strongest signal)`                                                                                                                                 |
| Login changes                    | `2. Changed login with stable numeric ID`                                                                                                                                     |
| Approved email fallback          | `3. Approved email fallback`; `4. GitHub private noreply email handling`                                                                                                      |
| Author versus committer          | `5. Committer ID match when author is null/missing`                                                                                                                           |
| Co-authors                       | `parseCoAuthorsFromMessage extracts co-authors from commit message`; `6. Co-authored commit matching owner email in message`                                                  |
| web-flow commits                 | `7. GitHub web-interface commit (web-flow committer) with owner author`                                                                                                       |
| Verified bots                    | `8. Dependabot & verified bot accounts`                                                                                                                                       |
| Spoofed bot-like usernames       | `9. Spoofed bot-like login with owner numeric ID is verified`                                                                                                                 |
| Ambiguous attribution            | `11. Ambiguous attribution for unverified author on shared repo`                                                                                                              |
| 403 and 429 secondary limits     | `GitHubClient handles 403 secondary limits with bounded Retry-After retries`; `GitHubClient handles 429 secondary limits with bounded Retry-After retries`                    |
| Primary limits                   | `GitHubClient handles 200 OK and parses rate limits & ETag`; `GitHubSyncService stops before the next repository when the primary limit is low`                               |
| ETag/304                         | `GitHubClient handles 304 Not Modified`                                                                                                                                       |
| Pagination bounds/loops          | `parseGitHubLinkHeader handles rel="next" and detects loops`; `GitHubSyncService bounds discovery pagination to five pages and prevents link loops`                           |
| Timeout/retry bounds             | `GitHubClient enforces request timeouts and a maximum of three network attempts`                                                                                              |
| Concurrent synchronization       | `GitHubSyncService skips repository currently locked in syncing state`; `18. M6 synchronization uses an atomic owner-scoped claim with stale-claim recovery`                  |
| Stale-claim recovery             | `GitHubSyncService recovers a synchronization claim stale for more than five minutes`; `18. M6 synchronization uses an atomic owner-scoped claim with stale-claim recovery`   |
| Partial repository failure       | `GitHubSyncService continues after partial repository failure and reports missing or force-pushed upstream objects`                                                           |
| Atomic acceptance/rollback       | `16. M6 candidate acceptance is atomic and rolls back when the D1 batch fails`                                                                                                |
| Owner overwrite protection       | `17. M6 candidate refresh protects owner-authored fields while updating repository privacy`                                                                                   |
| Repository privacy transitions   | `17. M6 candidate refresh protects owner-authored fields while updating repository privacy`                                                                                   |
| Missing/force-pushed objects     | `GitHubSyncService continues after partial repository failure and reports missing or force-pushed upstream objects`                                                           |
| Repository/project linking       | `15. M6 repository identity, repository/project linking, candidate review, and acceptance`                                                                                    |
| Activity deduplication/timezone  | `activity heatmap deduplicates events and respects timezone day boundaries`                                                                                                   |
| Public/private heatmap isolation | `public activity heatmap excludes private and unpublished activity without count leakage`; `GET /api/v1/public/activity returns public heatmap projection with count masking` |
| Token secrecy                    | `sanitizeSecretText redacts token strings from error text`; `GET /api/v1/private/integrations/github/status requires auth and returns active status without leaking token`    |
| Authorization                    | `Private integration endpoints fail closed without auth (401 AUTH_REQUIRED)`                                                                                                  |
| CSRF and IDOR                    | `GitHub mutation routes enforce CSRF and return opaque owner-scoped IDOR failures`                                                                                            |
| Mass assignment                  | `PUT GitHub identity uses authenticated ownership and rejects owner and approval mass assignment`                                                                             |
| Browser accessibility            | `32. Dashboard GitHub Integration passes axe accessibility scan`; `33. Dashboard GitHub Integration remains keyboard operable with reduced motion`                            |

## Migration integrity

- Migration 016 SHA-256: `14cc57da014073863d9c4e30ac649e00b6d13242f0296c783690849c798786e4`
- Current manifest SHA-256: `58c168f7a220e5b53c3a7d715838c638d80952753bff1144750b52b8e75b56b6`
- Fresh D1 execution: migrations 001–016 passed.
- Upgrade execution: immutable M5 baseline 001–015 upgraded through 016.
- Manifest checksum and migration-order verification passed.

## Final commands and results

| Command                                                                | Result                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm test:sequential`                                                 | 287 passed, 0 failed, 0 skipped                                            |
| `pnpm --dir apps/web exec playwright test --workers=1 --reporter=line` | 33 passed, 0 failed, 0 skipped                                             |
| `pnpm typecheck`                                                       | 14/14 packages passed                                                      |
| `pnpm lint`                                                            | 14/14 packages passed with zero warnings                                   |
| `pnpm format:check`                                                    | Passed; zero unchanged legacy files baselined                              |
| `pnpm migrations:check`                                                | Order and all 16 manifest checksums passed                                 |
| `node infrastructure/scripts/verify-migrations.mjs`                    | Fresh 001–016, M5 001–015 → 016, and the seeded M5 legacy-data path passed |
| `pnpm security:scan`                                                   | Passed; no repository secrets detected                                     |
| `pnpm audit`                                                           | Passed without a severity threshold; no known vulnerabilities              |
| `pnpm build`                                                           | Production web and worker build passed                                     |
| `git diff --check`                                                     | Passed                                                                     |

### Per-package unit/integration counts

| Package                |   Tests |
| ---------------------- | ------: |
| infrastructure-scripts |       8 |
| contracts              |       6 |
| design-system          |       5 |
| domain                 |      83 |
| observability          |       2 |
| web                    |       5 |
| authorization          |      23 |
| content                |      42 |
| search                 |       5 |
| test-fixtures          |      15 |
| database               |      35 |
| evidence               |      25 |
| worker                 |      33 |
| **Total**              | **287** |

Browser tests: 33 passed. Failures: 0. Skips: 0.

Accessibility automation found zero axe violations under the configured rules. Keyboard focus and reduced-motion emulation passed for the GitHub dashboard. Automated checks do not certify complete WCAG conformance; manual assessment is still required.

## Known limitations

- GitHub integration is manual/read-only REST synchronization; it does not use webhooks.
- Discovery is capped at five pages, with each selected repository bounded to 30 recent commits and 10 recent releases per run.
- A GitHub 404 is conservatively reported as missing or access-revoked because GitHub intentionally obscures private-resource existence.
- Tokens must be provisioned as Cloudflare Worker secrets; no OAuth installation flow is included in M6.
- Accessibility still requires manual assistive-technology and usability assessment.

## Files changed relative to `9ca8b86897cc02fe49cb493c1e1f61acb88dd1d3`

1. `apps/web/e2e/accessibility.spec.ts`
2. `apps/web/src/components/ActivityHeatmap.tsx`
3. `apps/web/src/components/dashboard/GitHubEvidenceManager.tsx`
4. `apps/worker/src/github-routes.test.ts`
5. `apps/worker/src/index.ts`
6. `apps/worker/src/routes/github.ts`
7. `apps/worker/src/routes/private.ts`
8. `apps/worker/src/routes/public.ts`
9. `docs/M6_GITHUB_INTEGRATION_CLOSURE.md`
10. `infrastructure/scripts/verify-migrations.mjs`
11. `packages/database/src/database.test.ts`
12. `packages/database/src/repositories/github.ts`
13. `packages/domain/src/entities/github-types.ts`
14. `packages/domain/src/rules/github-rules.test.ts`
15. `packages/domain/src/rules/github-rules.ts`
16. `packages/evidence/src/github-client.ts`
17. `packages/evidence/src/github-sync-service.ts`
18. `packages/evidence/src/github.test.ts`
