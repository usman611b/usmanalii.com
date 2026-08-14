# M8.5 Release Consolidation Report

## Status

Local implementation and verification are complete. The read-only remote staging comparison
confirmed that migrations 001–017 are applied and only checksum-approved migrations 018–019 are
pending. No migration, staging deployment, production deployment, DNS change, or persistent-data
mutation was performed. Final freeze still requires the M8.5 commit and clean-tree proof.

## Consolidated release

The release candidate brings the previously uncommitted M7.5–M8 work into one coherent delta:

- functional public pages and owner-only Command Center pages backed by canonical APIs;
- profile, social, contact, résumé, project, engineering-record, evidence, skill, and GitHub flows;
- migration 018 for canonical profile/social/contact fields;
- migration 019 for owner-approved career roles and project-role relationships;
- the bounded database-driven Career Knowledge Universe with lazy 3D and semantic table fallbacks;
- the M8 design system across public and private pages;
- checksum-protected staging configuration and non-mutating remote-plan support.

## M8.5 hardening delta

- Removed generated staging build directories and excluded future `dist-staging` output.
- Removed legacy graph owner-ID fallbacks; protected routes use only authenticated owner context.
- Added declarative career-role schemas and API/repository ownership regressions.
- Added career graph broad/focus bounds, public SQL filtering, deterministic layout, and lifecycle
  tests.
- Added Cloudflare Turnstile to the public contact flow with mandatory server-side Siteverify,
  action binding, token bounds, fail-closed behavior, exact CSP origins, and Resend delivery tests.
- Disabled unused Markdown syntax highlighting to remove the inline-code CSP conflict.
- Preserved the approved 3840 px portrait master as a design source and delivered responsive 960
  px/1600 px WebP assets instead, reducing transfer by approximately 96–98%.
- Replaced stale “100% compliant” QA language with measured automated results and explicit manual
  accessibility/visual checks.

## Final local verification

| Gate                              | Result                                                      |
| --------------------------------- | ----------------------------------------------------------- |
| Sequential workspace tests        | 344 passed, 0 failed, 0 skipped across 13 projects          |
| Playwright + configured axe rules | 50 passed, 0 failed, 0 skipped with one Chromium worker     |
| TypeScript                        | 14/14 packages, 0 errors/warnings/hints                     |
| ESLint                            | 14/14 packages, 0 errors/warnings                           |
| Formatting                        | Passed; 0 unchanged legacy files remain baselined           |
| Migration manifest/order          | 19/19 passed                                                |
| Fresh D1                          | Migrations 001–019 applied successfully                     |
| Historical upgrade                | Immutable 001–015 baseline upgraded through 019             |
| Cloudflare config isolation       | Passed                                                      |
| Secret scan                       | 0 findings                                                  |
| Dependency audit                  | Unthresholded audit: no known vulnerabilities               |
| Production build                  | 49 Astro pages; Worker dry run 966.84 KiB / 173.11 KiB gzip |
| Whitespace integrity              | `git diff --check` passed                                   |

Automated axe scans are not complete WCAG certification. Manual accessibility assessment remains
required.

## Performance evidence

- Homepage directly referenced JavaScript: 12,802 bytes gzip.
- Largest shared client runtime: 42,492 bytes gzip.
- Lazy 3D scene: 226,325 bytes gzip, dynamically imported after viewport activation.
- Responsive hero portrait: 121,444 bytes at 960 px and 210,756 bytes at 1600 px.
- The lazy 3D chunk retains Vite's >500 KB minified warning. It is excluded from ADR-009's public
  shell budget, never blocks primary content, pauses off-screen/hidden-tab, and does not load for
  reduced-motion or unsupported-WebGL users.

## Migration identity

| File                                         | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `018_profile_social_contact_m7_6.sql`        | `b0ec52329359d7fc0df83b21de017e697a9aeb6b6632b6fb87273517a0997516` |
| `019_career_knowledge_graph.sql`             | `dbca0eb6417118db8a33b39e5400b729b2a3a2f0f17c24b369cead4af7d44e13` |
| `packages/database/migrations/manifest.json` | `d6e4c7d33f77051ff2d134ff164c97da2c6ea10c072eee70237cd51f1fb64f2b` |

## Required owner-supplied configuration

For the read-only remote plan, set `CLOUDFLARE_API_TOKEN` only in the current terminal/process and
run:

```text
pnpm migrations:staging:remote-plan
```

Verified on 2026-08-15: remote schema versions 001–017 are applied and only migrations 018 and 019
are pending. The command made no remote changes. Do not use `--apply` without separate owner
approval.

Before a later staging deployment, also configure:

- Worker secret `TURNSTILE_SECRET_KEY`;
- Pages build variable `PUBLIC_TURNSTILE_SITE_KEY`;
- Turnstile hostname allowlist entry `staging.usmanalii.com`.

The existing Worker secrets remain required as documented in the staging guide. Never deploy
`LOCAL_OWNER_TOKEN`.

## Freeze condition

The read-only remote plan reported only 018–019 pending. Rerun formatting and Git integrity, create
one final M8.5 commit, and confirm a clean working tree. Applying migrations or deploying staging
requires a separate explicit owner approval.
