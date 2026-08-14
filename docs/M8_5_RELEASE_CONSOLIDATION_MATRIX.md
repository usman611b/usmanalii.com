# M8.5 Release Consolidation and Production Readiness Matrix

## Status

Authorized and locally verified. The read-only remote staging comparison confirmed migrations
001–017 applied and only 018–019 pending. No deployment is authorized. Final closure is waiting
only for the final commit and clean-tree proof.

## Milestone outcome

Consolidate the existing M7.5–M8 implementation into one reviewable release, verify migrations
018–019 and affected public/private workflows, prepare a checksum-approved staging upgrade, and
produce truthful closure evidence. M8.5 adds no new product pillar.

## Safety boundaries

- Do not modify historical migrations 001–019 or their approved vocabulary.
- Do not weaken public eligibility, owner authentication, CSRF, private artifact delivery, or human
  approval boundaries.
- Do not invent professional facts or seed synthetic facts into persistent databases.
- Do not deploy staging or production without separate explicit owner approval.
- Do not describe automated axe scans as complete WCAG certification.
- Do not claim completion before a final commit exists and the working tree is clean.

## Reused authorities

| Concern                | Existing authority                                                          |
| ---------------------- | --------------------------------------------------------------------------- |
| Migration immutability | ADR-011, checksum manifest, compatibility runner                            |
| Content storage        | ADR-005 canonical JSON blocks                                               |
| Authentication         | Cloudflare Access JWT and owner authorization middleware                    |
| Privacy                | Repository-level public projections and eligibility rules                   |
| Artifacts              | ADR-006 Worker-mediated R2 delivery                                         |
| GitHub evidence        | M6 sync, attribution rules, and human review queue                          |
| Identity and résumé    | M7 canonical profile, claims, and résumé projections                        |
| UI authority           | M8 design tokens and approved visual baselines under `docs/design`          |
| 3D lifecycle           | ADR-009 lazy canvas, visibility pause, reduced-motion, and static fallbacks |
| Staging isolation      | M7.5 ignored Wrangler override and staging-only executor                    |

## Requirement-to-evidence matrix

| ID      | Requirement                                       | M8.5 evidence                                                                                  | Status                |
| ------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------- |
| REL-001 | Preserve one coherent release delta               | Generated staging build output removed/ignored; changed-file inventory and reports reconciled  | Locally complete      |
| REL-002 | Preserve factual and privacy integrity            | Eligibility, IDOR, signed-out, export, fixture, and factual-integrity suites pass              | Locally complete      |
| REL-003 | Keep migrations 001–019 immutable and executable  | 19 checksums/order pass; fresh D1 and historical 001–015→019 upgrade pass                      | Locally complete      |
| REL-004 | Make affected Command Center controls operational | API, repository, browser, keyboard, graph, project, identity, résumé, and GitHub suites pass   | Locally complete      |
| REL-005 | Keep contact and social data canonical            | Shared schemas, private contact target, CSRF, Turnstile, Resend failure path, and CSP verified | Locally complete      |
| REL-006 | Keep the career graph database-driven and bounded | Broad/focus bounds, public SQL filters, owner checks, deterministic layout, and table fallback | Locally complete      |
| REL-007 | Meet security and production browser policy       | Strict API CSP retained; exact Turnstile origins added; production build and browser run pass  | Locally complete      |
| REL-008 | Meet practical performance budgets                | Direct homepage JS 12,802 B gzip; shared runtime 42,492 B; lazy 3D 226,325 B                   | Locally complete      |
| REL-009 | Produce a non-mutating staging upgrade plan       | Local plan passes; remote read-only check confirms 001–017 applied and only 018–019 pending    | Complete              |
| REL-010 | Close with reproducible evidence                  | Full pipeline and remote plan pass; documentation synchronized                                 | Awaiting final commit |

## Required final commands

```text
pnpm test:sequential
pnpm --dir apps/web exec playwright test --workers=1 --reporter=line
pnpm typecheck
pnpm lint
pnpm format:check
pnpm migrations:check
node infrastructure/scripts/verify-migrations.mjs
pnpm cloudflare:config:check
pnpm security:scan
pnpm audit
pnpm build
git diff --check
pnpm migrations:staging:remote-plan
```

The final remote-plan command is read-only. It must list only unapplied checksum-approved files and
must not run with `--apply`.

## Definition of done

M8.5 is complete only when REL-001–REL-010 are satisfied, documentation matches the final
implementation, a final commit exists, and `git status --short` is empty. Staging deployment needs
separate explicit approval after closure.
