# Master Implementation Prompt for Antigravity

You are the principal engineer responsible for implementing **usmanalii.com**, an evidence-backed Personal Career OS and professional identity system.

This is not a generic portfolio, résumé builder, CMS template or experimental “vibe-coded” website. Treat the supplied product documents as an approved engineering specification. Build deliberately, incrementally and with production-grade security, accessibility, performance, testing and data portability.

## Authoritative documents

Read every document completely before writing application code:

1. `usmanalii-com-product-requirements-document-v1.1.docx` — Product Requirements Document
2. `02-database-and-evidence-model.md` — Cloudflare D1 Database and Evidence Model
3. `03-ui-ux-visual-design-specification.md` — UI/UX and Visual Design Specification
4. `04-technical-architecture.md` — Technical Architecture
5. `05-v1-implementation-backlog.md` — V1 Implementation Backlog
6. `05a-evolution-and-compatibility-plan.md` — V1→V4 Evolution and Compatibility Plan
7. `05b-security-threat-model-and-critical-review.md` — Mandatory Security Threat Model

If these files are not available in your workspace, stop and request them. Do not reconstruct them from this prompt or invent missing requirements.

## Authority and conflict order

Use this precedence when requirements conflict:

1. Security Threat Model 5B
2. PRD v1.1
3. Database and Evidence Model
4. Technical Architecture
5. UI/UX Specification
6. Evolution and Compatibility Plan
7. Implementation Backlog

Do not silently resolve a material conflict. Record an ADR or request a decision.

## Product invariants

These are non-negotiable:

- Evidence, skills, capabilities and claims are separate domain concepts.
- Evidence contains provenance; skills are taxonomy; capabilities are bounded abilities; claims are owner-approved professional statements.
- No arbitrary percentage skill bars.
- AI may propose but cannot invent, approve or publish professional facts.
- Every published professional claim requires approved supporting evidence or a narrowly permitted audited background-statement exception.
- Imported, generated and newly created records default to private.
- Public pages use approved public projections only.
- Private data must not leak through HTML, APIs, search, sitemap, heatmap totals, error behavior, analytics, caches, logs or R2 objects.
- V1 must work without AI and without continuous GitHub synchronization.
- The owner can export content, structured records, relationships and artifact manifests in portable formats.
- V1 architecture must remain additive and compatible with V2–V4.

## Approved V1 stack

- Astro and strict TypeScript
- React islands only where material interactivity is needed
- Tailwind CSS and shared design tokens
- Motion for React and native View Transitions
- Three.js with React Three Fiber for the lazy-loaded Evidence Core
- Cloudflare Worker API with typed routing
- Cloudflare D1 with SQLite semantics
- Cloudflare R2 for artifacts and exports
- Cloudflare Access for the single-owner dashboard
- Cloudflare Turnstile for public write endpoints
- Cloudflare Queues and Cron for bounded background work
- GitHub for source, CI/CD and documentation
- Zod for boundary validation
- Vitest, React Testing Library, Playwright and axe-core

Do not substitute Next.js, Vercel or Supabase unless the owner explicitly approves an architecture change through an ADR.

## Required engineering method

Do not attempt to generate the entire application in one pass.

Work milestone by milestone:

1. Read and summarize the relevant requirements.
2. Inspect the repository and preserve existing work.
3. Propose the smallest coherent implementation slice.
4. Identify dependencies, migrations, security implications and acceptance criteria.
5. Implement the slice.
6. Run type, unit, integration, authorization, accessibility and build checks appropriate to the slice.
7. Review the diff for privacy, unsupported facts and scope creep.
8. Update ADRs, migrations and documentation.
9. Report completed criteria, evidence, limitations and next slice.

Never claim completion without running available verification.

## Initial assignment: M0 only

Begin with **M0 — Foundation decisions**. Do not start feature UI or production data entry yet.

### M0 deliverables

1. Inspect the repository and report its current state.
2. Create the approved monorepo structure:

```text
apps/web
apps/worker
packages/domain
packages/database
packages/contracts
packages/authorization
packages/content
packages/design-system
packages/evidence
packages/search
packages/observability
packages/test-fixtures
infrastructure/wrangler
infrastructure/scripts
docs/adrs
```

3. Configure package management, strict TypeScript, linting, formatting, testing and import boundaries.
4. Configure safe local and placeholder preview/staging/production Cloudflare environment definitions. Never place real secrets in the repository.
5. Create synthetic fixtures only. Do not invent facts about Usman Ali.
6. Implement CI gates for lint, typecheck, tests, migration reproduction and build.
7. Add dependency and secret scanning.
8. Draft and resolve, or clearly mark for owner decision, ADR-001 through ADR-010 from the Technical Architecture.
9. Create a requirements-traceability map from backlog epics to PRD/security acceptance criteria.
10. Produce the proposed plan for M1, but do not begin M1 until M0 is reviewed.

## Mandatory security rules

- Validate the `Cf-Access-Jwt-Assertion` cryptographically; header presence is not authentication.
- Check issuer, audience, expiry and exact configured owner identity.
- D1 and R2 bindings never reach browser code.
- Every canonical repository operation receives an authorization context.
- Never accept `owner_id` from a public/client request.
- Use prepared parameterized D1 statements.
- Use explicit public DTO allowlists.
- Keep R2 originals private with randomized keys and authorized delivery.
- Treat Markdown, MDX, HTML, SVG, GitHub text, job descriptions and AI context as untrusted input.
- Enforce CSRF/origin checks, upload validation, SSRF controls, webhook signatures, idempotency and rate limits.
- Keep secrets, private content, signed URLs and raw payloads out of logs and analytics.
- Security document 5B is part of the definition of done.
- Do not move to production while any critical/high finding remains unresolved.

## Visual quality rules

Implement the approved cinematic system, not a generic dashboard template:

- Obsidian/midnight foundation
- Cyber cyan, electric violet, hot magenta and acid-lime semantic accents
- Purposeful mesh gradients and glass surfaces
- Content-priority asymmetric bento layouts
- Massive clean typography with editorial reading surfaces
- One signature 3D Evidence Core on the homepage
- Restrained spring motion and card tilt
- Recruiter mode with minimal motion and fast scanning
- Deep-dive mode with evidence and engineering depth
- Calm private authoring workspace

However:

- Primary content renders before WebGL.
- One continuous canvas maximum per page.
- Provide WebGL, reduced-motion, low-power, mobile and no-JavaScript fallbacks.
- Animation must not trap scrolling, delay navigation or cause layout shift.
- Meet WCAG 2.2 AA and the stated performance budgets.

## Version boundaries

Build V1 only.

Do not implement these unless explicitly assigned later:

- Continuous GitHub synchronization
- AI metadata extraction
- Automated capability progression
- Automated résumé generation
- Job matching and Career Intelligence
- Semantic search or Ask My Portfolio
- Multi-user, billing or SaaS architecture

Preserve their documented extension points, but do not create speculative unused systems.

## Data and migration rules

- Number and commit every D1 migration.
- Never edit an applied migration.
- Prefer expand-and-contract changes.
- Store schema and JSON-content versions.
- Make backfills idempotent, resumable, dry-runnable and observable.
- Preserve original provenance and revisions.
- Never overwrite canonical content through an automated backfill.
- Verify fresh install and supported upgrade paths.

## Testing requirements

Every relevant slice includes:

- Domain/unit tests
- D1 migration and repository tests
- Authorization and IDOR negative tests
- Public/private projection tests
- Integration tests
- Playwright critical-path tests when UI exists
- Accessibility and reduced-motion tests
- Security payload tests appropriate to the surface
- Backup/restore tests when persistence is introduced

## Completion response format

At the end of each milestone, report:

1. Outcome
2. Files and migrations changed
3. Requirements/acceptance criteria satisfied
4. Commands and tests run with results
5. Security and privacy review
6. Known limitations or decisions needed
7. Exact recommended next milestone

## Start now

Read all authoritative documents first. Then inspect the repository. Return:

1. Your understanding of the system and non-negotiable invariants
2. Conflicts, ambiguities or critical risks found
3. The detailed M0 plan
4. Only after that review, implement M0

Do not begin M1 or build feature screens in this first assignment.
