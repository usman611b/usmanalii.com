# usmanalii.com — Technical Architecture

**Document:** 4 of 6  
**Version:** 1.0  
**Depends on:** PRD v1.1, Database & Evidence Model v1.0, UI/UX Specification v1.0  
**Status:** V1 implementation baseline

## 1. Architecture objective

Build a durable, portable and near-zero-cost single-owner Career OS. Public traffic should be served primarily as static assets. Dynamic execution is reserved for the private dashboard, controlled publication, search operations, integrations and future intelligence. The application must remain useful without GitHub synchronization or AI.

## 2. Selected stack

| Layer               | Selection                                                                   |
| ------------------- | --------------------------------------------------------------------------- |
| Public application  | Astro, TypeScript, static-first rendering                                   |
| Interactive UI      | React islands                                                               |
| Styling             | Tailwind CSS plus CSS custom-property tokens                                |
| Motion              | Motion for React and native View Transitions                                |
| 3D                  | Three.js with React Three Fiber, lazy-loaded                                |
| API                 | Cloudflare Worker with Hono-style typed routing                             |
| Database            | Cloudflare D1 using SQLite semantics                                        |
| Files               | Cloudflare R2                                                               |
| Authentication      | Cloudflare Access for the owner dashboard                                   |
| Bot protection      | Cloudflare Turnstile                                                        |
| Background work     | Cloudflare Queues and Cron Triggers                                         |
| Hosting/CDN/DNS/TLS | Cloudflare Pages/Workers                                                    |
| Source and CI       | GitHub and GitHub Actions/Cloudflare builds                                 |
| Validation          | Zod and shared TypeScript domain types                                      |
| Testing             | Vitest, React Testing Library, Playwright and axe-core                      |
| Analytics           | Cloudflare Web Analytics with privacy-safe custom events                    |
| AI                  | Optional provider adapter/local model from V2; absent from V1 critical path |

## 3. System context

```mermaid
flowchart LR
  Visitor --> CDN[Cloudflare static assets/CDN]
  Owner --> Access[Cloudflare Access]
  Access --> App[Astro dashboard]
  App --> API[Worker API]
  CDN --> API
  API --> D1[(Cloudflare D1)]
  API --> R2[(Cloudflare R2)]
  API --> Queue[Cloudflare Queues]
  Queue --> Jobs[Worker consumers]
  Jobs --> D1
  Jobs --> R2
  GitHub --> Webhook[Verified webhook endpoint]
  Webhook --> Queue
  Repo[GitHub repository] --> Build[Cloudflare build]
  Build --> CDN
  Backup[Encrypted portable backups] <-- D1
  Backup <-- R2
```

## 4. Architectural principles

1. Static public delivery by default.
2. One trusted API boundary for D1 and R2.
3. Authorization before data access, not after response creation.
4. Canonical data separated from public projections.
5. Append-oriented revision, proposal and audit history.
6. Idempotent integrations and background jobs.
7. AI proposal-only architecture.
8. Portable formats and replaceable providers.
9. Progressive enhancement and graceful 3D/motion fallback.
10. Explicit cost and resource budgets.

## 5. Repository structure

```text
apps/
  web/                    Astro public site + dashboard shell
  worker/                 API routes, jobs and webhook handlers
packages/
  domain/                 Entities, value objects and business rules
  database/               D1 repositories, migrations and fixtures
  contracts/              Zod schemas and API DTOs
  authorization/          Identity, ownership and visibility policy
  content/                Markdown/MDX import/export and rendering rules
  design-system/          Tokens and reusable UI components
  evidence/               Provenance and support-edge logic
  search/                 Public index and authenticated search
  observability/          Logging, metrics and error taxonomy
  test-fixtures/          Synthetic evidence/project/content fixtures
infrastructure/
  wrangler/               Environment bindings and configuration
  scripts/                Backup, restore and migration verification
docs/                     Six approved project documents and ADRs
```

Packages must not import application adapters into the domain layer. Cloudflare-specific APIs remain behind interfaces.

## 6. Rendering architecture

### Static routes

Home, Journey, public entries, Skills, Capability detail, Projects, case studies, Activity, About, Recruiter mode, Deep-dive mode, Résumé, Privacy and public search shell are statically generated or served from cached publishable projections.

### Dynamic routes

Dashboard routes, preview, mutation endpoints, private search, exports, upload authorization, webhook endpoints and future Ask My Portfolio are dynamic.

### Publication pipeline

1. Owner saves canonical private record.
2. Worker validates content, relationships, evidence and visibility.
3. Owner previews the exact public projection.
4. Publish transaction writes revision and publish state.
5. A queue job regenerates public projection/search data and triggers deployment or cache revalidation.
6. Deployment succeeds before the prior public version is retired.
7. Audit event records the operation.

Publishing failures leave canonical data intact and display the last successful public version.

## 7. React-island boundaries

Astro owns document structure, navigation, SEO and long-form content. React is used only for:

- Evidence Core and approved 3D visualizations
- Heatmap interaction and day drawer
- Evidence relationship graph
- Dashboard forms and autosave
- Approval diff and impact preview
- Project engineering timeline
- Search/filter experiences requiring local state
- Command palette

No page should hydrate an entire React application when isolated islands suffice.

## 8. Worker API architecture

Layers:

1. Route and request parsing
2. Authentication and Access-token validation
3. Authorization and effective-visibility resolution
4. Application use case
5. Domain rules
6. D1/R2 repository interfaces
7. Response DTO and field redaction
8. Audit and telemetry

API conventions:

- `/api/v1/` version prefix
- Zod request/response schemas
- Stable machine error codes
- Request/correlation ID
- Cursor pagination
- Idempotency key for imports, approvals and publish actions
- Optimistic concurrency through `version_no`
- JSON errors without stack traces or entity-existence leakage

## 9. Initial API groups

- `/content` and `/content/:id/revisions`
- `/skills` and `/capabilities`
- `/projects`, events, artifacts, experiments, ADRs, lessons and deployments
- `/evidence` and `/evidence-links`
- `/claims`
- `/activities`
- `/approvals`
- `/profile`
- `/search`
- `/uploads`
- `/exports`
- `/integrations/github`
- `/webhooks/github`
- `/health` with public-safe and owner-detailed variants

## 10. Authentication and authorization

Cloudflare Access protects `/dashboard/*` and private APIs. The Worker validates issuer, audience, expiry and signature of the Access JWT. The verified email/subject must match the configured owner identity.

Every repository call receives an authorization context. Policy checks include:

- Authenticated identity
- Owner match
- Entity ownership
- Requested action
- Effective visibility
- Parent visibility
- Embargo and publication state
- Field-level disclosure

Public endpoints never accept owner IDs or arbitrary visibility filters from clients.

## 11. D1 data access

- Use numbered migrations committed to Git.
- Use parameterized prepared statements only.
- Wrap multi-record approvals/publications in D1 batch/transaction behavior appropriate to the binding.
- Keep queries inside typed repository modules.
- Require indexes for dashboard lists and public projections.
- Avoid unbounded reads and full-table scans.
- Use cursor pagination for all expandable lists.
- Store UTC timestamps as ISO text and validate at boundaries.
- Store JSON as validated text with schema version.

## 12. R2 storage

Buckets or prefixes separate:

- Private originals
- Public optimized derivatives
- Temporary uploads
- Generated exports
- Backup manifests

Upload flow:

1. Authenticated owner requests upload authorization.
2. Worker validates type, size and intended entity.
3. Object receives randomized key.
4. Metadata record remains private and unverified.
5. Processing validates checksum/type and creates derivatives.
6. Owner approves visibility.

Private files are served through authorized Worker responses or short-lived signed access. Export links expire.

## 13. Background jobs

Queue message envelope includes message ID, type, schema version, owner ID, entity references, attempt and trace ID.

V1 job types:

- Public projection/index update
- Link health check
- Image/artifact processing
- Export generation
- Backup verification
- Notification dispatch

V2 adds GitHub reconciliation and AI proposal generation. Jobs are idempotent, retry with bounded exponential backoff and move repeated failures to a reviewable dead-letter state.

## 14. GitHub integration

### V1

Manual links to repositories, commits, files, pull requests and releases. Store repository, ref/SHA, path, URL and last verification. Refresh selected public metadata on demand or low-frequency schedule.

### V2

Use a least-privilege GitHub App. Verify webhook signatures, persist event IDs, acknowledge quickly and enqueue normalization. Scheduled reconciliation repairs missed events. Private repository content is excluded unless separately enabled.

GitHub topics, dependency files and commit counts never become capabilities automatically.

## 15. Search

Public V1 search uses a generated static index containing only published public fields. Private dashboard search uses indexed D1 queries through authenticated endpoints. Publication and unpublication trigger index replacement. V3 semantic search adds a provider-neutral embedding adapter and authorization before and after retrieval.

## 16. AI architecture

V1 has no mandatory AI runtime. V2/V3 introduce an adapter with:

- Structured-output schemas
- Prompt and model version registry
- Allowed-context builder
- Source citations
- Risk classification
- Cost/token controls
- Evaluation fixtures
- Proposal storage

AI cannot directly call canonical mutation or publication use cases. Approval applies field-level changes transactionally and writes an audit event.

## 17. Frontend performance architecture

- Pre-render public content.
- Lazy-load React islands below the fold.
- Load Three.js only on routes requiring it.
- One continuous WebGL canvas per page maximum.
- Clamp pixel ratio and stop rendering offscreen/hidden.
- Use responsive images with explicit dimensions.
- Preload only critical font subsets.
- Cache immutable assets with content hashes.
- Do not place analytics, AI or database calls on ordinary static page views.

## 18. Security controls

- Cloudflare Access for dashboard/API
- Strong owner identity and MFA where available
- Origin and CSRF validation on mutations
- Turnstile and rate limits on public forms
- Strict CSP and security headers
- MDX/HTML sanitization and component allowlist
- No arbitrary executable code in content
- Secrets in Cloudflare secret storage
- Webhook signature validation
- Upload type/size verification and metadata stripping
- Redacted structured logs
- Dependency and secret scanning in CI
- Authorization, IDOR and prompt-injection tests
- Audit events for security-sensitive and professional-fact changes

## 19. Observability

Structured logs contain timestamp, environment, request/trace ID, route/use case, duration, status/error code and safe entity type/ID. They exclude evidence bodies, job descriptions, secrets, email content, AI prompts and private artifacts.

Metrics:

- Availability and latency
- Publish success/failure
- Queue age, retries and dead letters
- D1 rows read/written and storage
- R2 storage/operations
- Link-health failures
- Backup/export success
- Client performance and WebGL fallback rates

Alerts cover repeated publish failures, authorization anomalies, queue backlog, backup failure and approaching free-tier limits.

## 20. Environments and deployment

| Environment | Data                              | Infrastructure                         |
| ----------- | --------------------------------- | -------------------------------------- |
| Local       | Synthetic fixtures                | Astro dev + Wrangler local D1/R2       |
| Preview     | Synthetic/scrubbed only           | Branch preview and staging bindings    |
| Staging     | Representative non-sensitive data | Protected domain, D1 and R2            |
| Production  | Canonical owner data              | usmanalii.com, production Worker/D1/R2 |

CI gates: lint, typecheck, unit tests, migration reproduction, authorization tests, build, accessibility smoke tests and dependency/security checks. Production deployment requires staging verification and backup readiness.

## 21. Backup and disaster recovery

- D1 Time Travel for short-window recovery
- Scheduled encrypted SQLite/SQL exports
- Versioned JSON and Markdown export
- R2 object manifest with checksums
- Separate encrypted copy of critical artifacts
- Monthly integrity verification
- Quarterly full staging restore
- Documented RPO/RTO and incident runbook

The system must be reconstructible from Git, database export and artifact archive without proprietary application export tools.

## 22. Cost controls

- Static public delivery minimizes Worker invocations.
- No periodic job runs more frequently than required.
- Raw GitHub commits are not continuously polled.
- Images and files stay within R2 lifecycle/storage policy.
- AI is opt-in and absent from page views.
- Usage dashboards and alerts monitor Workers, D1 and R2 allowances.
- The only planned unavoidable recurring cost is domain renewal.

## 23. Architecture testing

- Domain rule unit tests
- D1 migration/constraint/index tests
- Repository integration tests
- Access-token and authorization negative tests
- Public projection privacy tests
- R2 upload/delivery tests
- Webhook signature/idempotency tests
- Queue retry/dead-letter tests
- Publish rollback/last-good-version tests
- Playwright public and dashboard journeys
- Accessibility and reduced-motion tests
- WebGL fallback and performance tests
- Backup and restore rehearsal

## 24. Architecture acceptance criteria

1. Public pages remain available when D1 is temporarily unavailable, using the last successful static build.
2. Browser code contains no D1, R2 or privileged credentials.
3. Different/unauthenticated identities cannot access private entities or infer their existence.
4. Publishing is idempotent, audited and recoverable.
5. Unpublishing removes public projection and search data without deleting canonical history.
6. V1 operates with GitHub and AI disabled.
7. All migrations reproduce an empty database deterministically.
8. A staging restore reconstructs relationships and artifacts.
9. The WebGL experience does not block content or violate performance budgets.
10. Usage remains observable against free-tier limits.
11. The domain layer can be reused with a different database/storage adapter.
12. Every security-sensitive mutation has an authorization test and audit behavior.

## 25. Required ADRs before coding

- ADR-001: Astro static rebuild versus cached runtime public projection
- ADR-002: Hono routing and API contract conventions
- ADR-003: Cloudflare Access owner identity configuration
- ADR-004: D1 transaction/batch strategy for approvals and publishing
- ADR-005: Content block canonical format and Markdown export
- ADR-006: R2 public/private object delivery
- ADR-007: Search-index generation and invalidation
- ADR-008: Backup encryption and off-provider archive
- ADR-009: WebGL renderer lifecycle and fallback policy
- ADR-010: Error reporting provider and privacy settings

## 26. Approval decision

Approval freezes the platform, trust boundaries, static-first strategy, Worker authorization boundary, D1/R2 responsibilities, publication pipeline and portability requirements. Implementation may refine internal modules through ADRs without weakening evidence integrity, privacy, accessibility, cost controls or human approval.

## 27. R2/D1 Consistency & Safe Artifact Delivery Architecture (M3 Verification)

- **Unpredictable Server Storage Keys**: Randomized R2 keys `artifacts/${ownerId}/${uuid}.${ext}` generated exclusively on server. User file paths stripped.
- **R2/D1 Failure Isolation & Rollback**: If R2 upload succeeds but D1 `create()` fails, the Worker immediately deletes the newly created R2 object (`await r2.delete(r2Key)`).
- **Reconciliation Endpoint**: `/api/v1/private/artifacts/reconcile` sweeps orphaned R2 objects and flags missing D1 bindings without public key exposure.
- **Strict Delivery Headers**: Sets `Content-Type`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, sanitized `Content-Disposition: attachment; filename="..."`, and `Cache-Control: private, no-store, must-revalidate` (private) / `public, max-age=3600` (public eligible).
