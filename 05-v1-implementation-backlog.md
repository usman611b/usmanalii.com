# usmanalii.com — V1 Implementation Backlog

**Document:** 5 of 6  
**Version:** 1.0  
**Depends on:** Documents 1–4  
**Scope:** V1 Foundation only  
**Status:** Build-ready baseline

## 1. Delivery objective

Deliver a secure, static-first Personal Career OS that allows the owner to capture learning and engineering work, maintain an Evidence Ledger, connect evidence to capabilities and claims, build deep project records, and publish recruiter and technical views from one approved source of truth.

V1 must work without AI and without continuous GitHub synchronization.

## 2. Priority definitions

- **P0:** Required for architecture, security or data integrity.
- **P1:** Required for V1 launch.
- **P2:** Valuable V1 enhancement; may move behind launch if necessary.
- **Deferred:** Explicitly belongs to V2–V4.

Story completion requires code, tests, accessibility, error states, observability and documentation—not only a visible screen.

## 3. Milestone sequence

| Milestone | Outcome |
|---|---|
| M0 — Foundation decisions | ADRs, repository and environments are ready |
| M1 — Secure platform | Public shell and protected dashboard run on Cloudflare |
| M2 — Canonical publishing | Owner can create, preview, revise and publish journal content |
| M3 — Evidence system | Evidence, provenance, artifacts and support edges work |
| M4 — Skills and claims | Capabilities and claims are evidence-backed |
| M5 — Engineering projects | Full project records and public case studies work |
| M6 — Discovery | Activity, search and relationship navigation work |
| M7 — Identity surfaces | Home, recruiter and deep-dive experiences are complete |
| M8 — Operations and launch | Export, backup, security and production release pass |

## 4. Epic E00 — Architecture decisions and repository

**Priority:** P0  
**Dependencies:** Approved documents 1–4

### Stories

- E00-S01: Create monorepo structure for web, Worker and shared packages.
- E00-S02: Configure TypeScript strict mode, linting, formatting and import boundaries.
- E00-S03: Write and approve ADR-001 through ADR-010.
- E00-S04: Configure local, preview, staging and production Cloudflare environments.
- E00-S05: Create synthetic fixture strategy containing no invented production facts.
- E00-S06: Configure CI for typecheck, lint, tests, migrations and builds.
- E00-S07: Add dependency and secret scanning.

### Acceptance criteria

- Repository builds from a clean checkout.
- Package boundaries prevent infrastructure imports into the domain layer.
- Environment bindings cannot accidentally point previews to production.
- CI blocks merging on failed typecheck, tests, migrations or build.
- All architecture decisions are recorded before dependent implementation.

## 5. Epic E01 — Design system and application shells

**Priority:** P1  
**Dependencies:** E00

### Stories

- E01-S01: Implement color, typography, spacing, radius, surface and motion tokens.
- E01-S02: Build accessible public navigation, footer and mobile menu.
- E01-S03: Build authenticated dashboard shell and navigation.
- E01-S04: Implement buttons, inputs, cards, dialogs, drawers, tables and status surfaces.
- E01-S05: Implement bento-grid primitives and responsive spans.
- E01-S06: Implement loading, empty, error, stale, offline and permission states.
- E01-S07: Add reduced-motion and low-power design modes.
- E01-S08: Create Storybook-equivalent component preview or internal component gallery.

### Acceptance criteria

- Every interactive component supports keyboard and visible focus.
- Components expose required states without layout shift.
- Tokens—not one-off values—control the visual system.
- Mobile works at 320px without horizontal overflow.
- Automated axe checks report no serious/critical violations.

## 6. Epic E02 — Authentication, authorization and security

**Priority:** P0  
**Dependencies:** E00

### Stories

- E02-S01: Configure Cloudflare Access for the owner identity.
- E02-S02: Validate Access JWT issuer, audience, signature and expiry in Worker middleware.
- E02-S03: Implement authorization context and owner matching.
- E02-S04: Implement effective-visibility policy service.
- E02-S05: Add CSRF/origin validation and mutation rate limits.
- E02-S06: Configure security headers and strict CSP.
- E02-S07: Configure Cloudflare secrets and secret-handling rules.
- E02-S08: Implement security audit events.
- E02-S09: Add Turnstile to public contact/form endpoints.

### Acceptance criteria

- Anonymous and different identities cannot access private APIs.
- Public errors do not reveal private entity existence.
- No privileged binding or secret reaches browser bundles or logs.
- Every mutation has authorization and negative tests.
- Security headers pass the release audit.

## 7. Epic E03 — D1 foundation and migrations

**Priority:** P0  
**Dependencies:** E00, Database Model

### Stories

- E03-S01: Create D1 migration runner and schema-version tracking.
- E03-S02: Implement profiles, content and revisions.
- E03-S03: Implement skills, capabilities and relationship tables.
- E03-S04: Implement projects and engineering-record tables.
- E03-S05: Implement artifacts, evidence and typed evidence links.
- E03-S06: Implement claims and claim relationships.
- E03-S07: Implement activities, integrations, proposals and audit tables.
- E03-S08: Add constraints, indexes and migration fixtures.
- E03-S09: Implement typed repositories and transaction/batch patterns.
- E03-S10: Add public-projection repository methods.

### Acceptance criteria

- Migrations reproduce an empty database deterministically.
- Evidence links reject zero or multiple targets.
- Unsupported professional claims cannot transition to publishable state.
- No numeric proficiency field exists.
- Required list/search queries use indexes and cursor pagination.
- Repository methods use parameterized statements only.

## 8. Epic E04 — Content authoring and publication

**Priority:** P1  
**Dependencies:** E01, E02, E03

### Stories

- E04-S01: Implement Note, Journal, Deep Dive and Retrospective templates.
- E04-S02: Build structured editor with headings, code, diagrams, images and callouts.
- E04-S03: Implement autosave, optimistic concurrency and recovery.
- E04-S04: Add skill, capability, project, evidence and related-entry selectors.
- E04-S05: Implement exact public preview.
- E04-S06: Implement publication validation.
- E04-S07: Create immutable revisions and rollback-as-new-revision.
- E04-S08: Implement scheduled, published, unlisted and archived states.
- E04-S09: Build public journey index and entry routes.
- E04-S10: Generate SEO, canonical URL, feed and sitemap data.

### Acceptance criteria

- Owner can complete the full draft→preview→publish→revise→unpublish flow.
- Failed saves preserve recoverable local content.
- Private dependencies cannot leak through publication.
- Published pages work without client JavaScript.
- Code, images and diagrams meet accessibility requirements.

## 9. Epic E05 — Evidence Ledger and artifacts

**Priority:** P1  
**Dependencies:** E02, E03, E04

### Stories

- E05-S01: Build Evidence Ledger list with filters and health states.
- E05-S02: Build evidence create/edit/detail flow.
- E05-S03: Store complete provenance and verification metadata.
- E05-S04: Implement typed evidence support edges.
- E05-S05: Implement duplicate detection by provider identity, URL and checksum.
- E05-S06: Implement archive, invalidate, dispute and broken-source behavior.
- E05-S07: Show dependent capabilities, claims, projects and content before changes.
- E05-S08: Implement R2 upload authorization, metadata and checksums.
- E05-S09: Generate private/public artifact delivery paths.
- E05-S10: Build public evidence detail page.

### Acceptance criteria

- Evidence provenance remains available after source failure.
- Archived evidence is not deleted and dependent support becomes unhealthy.
- Private artifacts cannot be downloaded through public paths.
- Public evidence shows only approved safe fields.
- Duplicate merging preserves all provenance.

## 10. Epic E06 — Skills, capabilities and claims

**Priority:** P1  
**Dependencies:** E03, E05

### Stories

- E06-S01: Build skill taxonomy, alias and hierarchy management.
- E06-S02: Build bounded capability editor and qualifying-evidence rules.
- E06-S03: Implement descriptive maturity states and rationale.
- E06-S04: Implement capability evidence timeline and diversity view.
- E06-S05: Build claim library with audience, context and review date.
- E06-S06: Validate claim support before approval/publication.
- E06-S07: Implement permitted background-statement exception flow.
- E06-S08: Build public skills index and capability detail routes.
- E06-S09: Display limitations, stale evidence and not-enough-evidence states.

### Acceptance criteria

- Skills never appear as percentage bars.
- Skill labels alone cannot create capabilities.
- Every published professional claim has approved support or a valid exception.
- Claim wording and evidence are traceable.
- Maturity changes require owner approval and rationale.

## 11. Epic E07 — Projects and engineering records

**Priority:** P1  
**Dependencies:** E03, E04, E05, E06

### Stories

- E07-S01: Build project create/edit and status management.
- E07-S02: Build project chronology and milestone types.
- E07-S03: Implement artifact association.
- E07-S04: Implement experiments.
- E07-S05: Implement ADRs.
- E07-S06: Implement debugging lessons.
- E07-S07: Implement deployments and releases.
- E07-S08: Implement role, contribution and collaboration disclosure.
- E07-S09: Build project case-study composer and preview.
- E07-S10: Build public project index and case-study routes.
- E07-S11: Implement dead-demo, private-repository and archived-project states.

### Acceptance criteria

- A representative project records problem, contribution, architecture, decisions, experiments, debugging, deployment, outcomes, limitations and evidence.
- Quantified outcomes require source evidence.
- Solo/team contribution is explicit.
- Public case study works with unavailable demo or repository.

## 12. Epic E08 — Activity and heatmap

**Priority:** P1  
**Dependencies:** E03–E07

### Stories

- E08-S01: Implement normalized activity creation.
- E08-S02: Implement deduplication and source-event identity.
- E08-S03: Implement category weights, caps and exclusions.
- E08-S04: Implement owner-timezone date aggregation.
- E08-S05: Build private reconciliation interface.
- E08-S06: Build public heatmap and day drawer.
- E08-S07: Build equivalent date-grouped accessible list.
- E08-S08: Ensure private counts cannot leak through public aggregates.

### Acceptance criteria

- Same event is counted once.
- Raw commits are capped/grouped and never treated as competence.
- Timezone change previews reaggregation.
- Heatmap works with keyboard and screen reader.
- No streak badges or inactivity shame messaging exists.

## 13. Epic E09 — Search and discovery

**Priority:** P1  
**Dependencies:** E04–E08

### Stories

- E09-S01: Generate public static search index from published fields.
- E09-S02: Implement private indexed D1 search.
- E09-S03: Implement taxonomy aliases and lightweight typo tolerance.
- E09-S04: Group results by content, project, capability and evidence.
- E09-S05: Implement URL-addressable filters.
- E09-S06: Purge public search artifacts on unpublish/delete.
- E09-S07: Create useful no-results and error states.

### Acceptance criteria

- Public search never reveals private matches or counts.
- Search index updates after publish/unpublish.
- Results expose type, date and useful context.
- Typical query meets the performance target.

## 14. Epic E10 — Professional identity surfaces

**Priority:** P1  
**Dependencies:** E01, E04–E09

### Stories

- E10-S01: Build canonical profile editor.
- E10-S02: Build homepage content projection.
- E10-S03: Build five-pillar navigation.
- E10-S04: Implement recruiter-mode projection.
- E10-S05: Implement deep-dive projection.
- E10-S06: Build About page.
- E10-S07: Build V1 approved résumé page/download link.
- E10-S08: Build contact path with Turnstile.
- E10-S09: Show last-reviewed and evidence-health signals.

### Acceptance criteria

- Recruiter can understand role, strongest proof, projects, résumé and contact within 90 seconds.
- Deep-dive exposes technical detail without duplicating canonical data.
- Unsupported or private facts do not enter public identity surfaces.

## 15. Epic E11 — Cinematic visual experience

**Priority:** P1 for core; P2 for enhanced polish  
**Dependencies:** E01, E10

### Stories

- E11-S01: Implement static CSS mesh-gradient background.
- E11-S02: Implement lazy WebGL Evidence Core.
- E11-S03: Implement semantic five-pillar fallback/navigation.
- E11-S04: Implement pointer-responsive lighting.
- E11-S05: Implement restrained card tilt and spring motion.
- E11-S06: Implement page/section transitions.
- E11-S07: Implement visual low-power, mobile and reduced-motion modes.
- E11-S08: Add renderer lifecycle, visibility pause and disposal.
- E11-S09: Validate JavaScript and Core Web Vitals budgets.

### Acceptance criteria

- Primary content renders before WebGL.
- One continuous canvas maximum.
- No animation traps scroll, delays navigation or causes layout shift.
- Static and reduced-motion experiences remain visually coherent.
- Representative mobile hardware remains responsive.
- Every visual effect communicates identity, relationship, hierarchy or state.

## 16. Epic E12 — Manual GitHub integration

**Priority:** P1  
**Dependencies:** E03, E05, E07

### Stories

- E12-S01: Add repository, commit, file, PR and release link capture.
- E12-S02: Store repository, ref/SHA, path, URL and provenance metadata.
- E12-S03: Verify public link availability on demand.
- E12-S04: Implement stale and broken GitHub evidence states.
- E12-S05: Render selected repository metadata publicly.
- E12-S06: Ensure topics, dependencies and commit volume do not infer capability.

### Acceptance criteria

- Links can be pinned to durable refs.
- Broken links preserve historical context.
- Private repository metadata remains private.
- V1 does not require GitHub OAuth/App access.

## 17. Epic E13 — Export, backup and recovery

**Priority:** P0/P1  
**Dependencies:** E03–E12

### Stories

- E13-S01: Export canonical entities and relationships as versioned JSON.
- E13-S02: Export content as Markdown/MDX-compatible files.
- E13-S03: Export D1 as encrypted SQLite/SQL backup.
- E13-S04: Generate R2 manifest and checksums.
- E13-S05: Create expiring protected download.
- E13-S06: Implement backup monitoring.
- E13-S07: Write restore runbook and automation.
- E13-S08: Perform staging restore rehearsal.

### Acceptance criteria

- Export includes schema version and README.
- Download expires and is audited.
- Restore rebuilds relationships and artifact references.
- Application can be reconstructed from Git, database export and artifact archive.

## 18. Epic E14 — Observability, analytics and operations

**Priority:** P1  
**Dependencies:** All platform epics

### Stories

- E14-S01: Implement redacted structured logs and error taxonomy.
- E14-S02: Add publish, queue, D1, R2 and backup metrics.
- E14-S03: Add alerts for repeated failure and free-tier approach.
- E14-S04: Configure privacy-safe Cloudflare Web Analytics.
- E14-S05: Implement owner-visible system health.
- E14-S06: Write incident, recovery and secret-rotation runbooks.

### Acceptance criteria

- Logs contain no private bodies, secrets or AI prompts.
- Operational failures are diagnosable through request/trace IDs.
- Approaching free limits produces an owner warning.
- Analytics do not capture dashboard content or raw private search queries.

## 19. Epic E15 — Launch hardening

**Priority:** P0/P1  
**Dependencies:** E00–E14

### Stories

- E15-S01: Import and privately validate representative real content.
- E15-S02: Publish one complete evidence chain and one complete project.
- E15-S03: Run accessibility audit and manual assistive-technology tests.
- E15-S04: Run security threat-model and authorization audit.
- E15-S05: Run mobile/WebGL/performance test matrix.
- E15-S06: Verify SEO, canonical redirects, sitemap, robots and feeds.
- E15-S07: Verify domain, DNS, TLS and security headers.
- E15-S08: Complete backup restore rehearsal.
- E15-S09: Validate every PRD V1 acceptance criterion.
- E15-S10: Create launch and rollback checklist.

### Acceptance criteria

- All release-blocking criteria pass with recorded evidence.
- No placeholder professional facts remain.
- Last-known-good public deployment can be restored.
- Private data is absent from public pages, APIs, search, analytics and aggregates.

## 20. Deferred backlog

### V2

- GitHub App and continuous synchronization
- AI metadata/evidence suggestions
- Approval automation enhancements
- Automated capability progression suggestions
- Automated portfolio propagation
- Résumé generation and tailoring

### V3

- Job requirement parsing and evidence matching
- Career gap recommendations
- Interview preparation
- Semantic search
- Ask My Portfolio
- Knowledge/evidence graph and advanced analytics

### V4

- Multi-user/tenant architecture
- SaaS onboarding, administration and billing
- Open-source/self-host distribution
- Connector marketplace

No deferred story may enter V1 without a PRD change decision.

## 21. Cross-cutting definition of done

A story is done only when:

- Acceptance criteria pass.
- Unit/integration/E2E tests appropriate to risk exist.
- Authorization and privacy behavior are tested.
- Loading, empty, error and recovery states exist.
- Keyboard, focus and reduced-motion behavior pass.
- Mobile behavior is verified.
- Logs/metrics are safe and useful.
- Migration and rollback/repair implications are documented.
- No unsupported professional fact is added.
- Documentation and shared contracts are updated.

## 22. Recommended build order

```text
E00 Architecture
  ↓
E02 Security + E03 Database
  ↓
E01 Design system
  ↓
E04 Content publishing
  ↓
E05 Evidence
  ↓
E06 Skills/capabilities/claims
  ↓
E07 Projects
  ↓
E08 Activity + E09 Search
  ↓
E10 Identity surfaces
  ↓
E11 Cinematic experience + E12 GitHub links
  ↓
E13 Backup + E14 Operations
  ↓
E15 Launch hardening
```

## 23. Approval decision

Approval authorizes implementation of V1 in the stated order. It does not authorize V2–V4 scope. Story sequencing may change for engineering efficiency, but security, evidence integrity, portability and launch gates cannot be deferred.
