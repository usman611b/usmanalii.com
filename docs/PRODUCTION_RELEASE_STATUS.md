# Production Release Status

**Reviewed:** 2026-08-25  
**Public hostname:** `https://usmanalii.com`  
**Owner surface:** Cloudflare Access-protected Command Center

## Current product state

The portfolio is a production career operating system, not a static résumé. The Command Center is
the canonical owner interface for projects, engineering records, journal entries, evidence,
artifacts, skills, capabilities, professional identity, résumés, claims, and career-graph
relationships. Public pages read publication-safe API projections; they do not contain duplicated
professional facts.

The Recruiter view is an advanced live résumé assembled from published profile, experience,
education, credentials, projects, skills, capabilities, approved claims, evidence counts, and
accepted graph relationships. Updating or publishing those records in Command Center updates the
Recruiter view without editing its page source.

## Production architecture

| Layer             | Production responsibility                                     |
| ----------------- | ------------------------------------------------------------- |
| Cloudflare Pages  | Static Astro public site and Command Center application shell |
| Cloudflare Worker | Public and authenticated APIs, authorization and projections  |
| Cloudflare D1     | Canonical structured records and append-only history          |
| Cloudflare R2     | Private and public artifact storage                           |
| Cloudflare Access | Owner authentication and dashboard/API protection             |

The Worker owns `usmanalii.com/api/*`; Pages serves every non-API route. Public projections enforce
visibility, publication state, archival state, approval state, and evidence health before records
can appear publicly.

## Verified release gates

| Gate               | Result                                                    |
| ------------------ | --------------------------------------------------------- |
| Type safety        | 14 of 14 workspace packages passed                        |
| Lint               | 14 of 14 workspace packages passed                        |
| Tests              | 371 tests across 13 projects passed                       |
| Production build   | 52 Astro pages and Worker dry run passed                  |
| Database integrity | 23 migration checksums and ordered migration files passed |
| Security scan      | No committed secret patterns detected                     |
| Formatting         | Incremental formatting gate passed                        |

## Release boundary

Application code, automated verification, and production bundles are complete. Cloud deployment
requires an authenticated Cloudflare Wrangler session. GitHub publication also requires a Git
remote and an active owner-authorized GitHub integration; those external account states are not
represented as complete until independently verified.

## Operational follow-up

- Export and retain encrypted D1/R2 backups on an owner-approved independent destination.
- Configure alerts for Worker errors, failed scheduled synchronization and availability checks.
- Confirm the GitHub integration is active and that its least-privilege token remains valid.
- Add the portfolio repository remote, publish the release commit and tag, and verify CI from a
  clean clone.
