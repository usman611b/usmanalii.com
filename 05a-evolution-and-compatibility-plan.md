# usmanalii.com — Evolution and Compatibility Plan

**Document:** 5A — Cross-version architecture companion  
**Version:** 1.0  
**Covers:** V1 → V2 → V3 → V4  
**Status:** Required before application implementation

## 1. Purpose

This plan ensures that each product version extends the same canonical professional record rather than creating a replacement application. V1 establishes the durable evidence and identity foundation. V2 adds automation, V3 adds private intelligence, and V4 may productize the system. Existing approved data must remain traceable and usable through every upgrade.

## 2. Compatibility principles

1. Prefer additive schema migrations.
2. Never reinterpret historical records silently.
3. Every derived assessment records its rule/model version.
4. Every canonical change remains auditable.
5. New automation defaults to proposal-only and private.
6. Old exports remain readable through versioned schemas.
7. APIs are versioned before breaking changes are introduced.
8. Features can be enabled independently through server-controlled flags.
9. Backfills are idempotent, resumable and observable.
10. Rollback must not require deleting canonical evidence.
11. Productization cannot weaken evidence integrity, privacy or ownership.
12. Provider-specific services remain behind adapters.

## 3. Permanent V1 foundation

The following concepts are expected to survive unchanged in meaning:

- Profile and canonical identity
- Content items and immutable revisions
- Skills as taxonomy
- Capabilities as bounded abilities
- Evidence Ledger and provenance
- Typed evidence-support relationships
- Claims as approved professional statements
- Projects and engineering records
- Artifacts and deployments
- Activities and deduplication
- Visibility and publication state
- Approval proposals and audit events
- Integration/provider identity
- Portable export and backup metadata

Physical tables may evolve, but these domain meanings cannot be merged or weakened without a PRD revision.

## 4. Version capability map

| Version | Adds                                                                     | Reads from                                           |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| V1      | Journal, evidence, capabilities, claims, projects, public identity       | Canonical owner records                              |
| V2      | GitHub sync, AI proposals, progression suggestions, résumé engine        | V1 evidence, claims and projects                     |
| V3      | Job matching, career gaps, interview prep, semantic retrieval            | V1 canonical data plus V2 approved automation output |
| V4      | Tenant isolation, onboarding, reusable integrations and product controls | Same domain model partitioned by workspace/tenant    |

## 5. V1 → V2 evolution

### Additive entities

- GitHub installations and selected repositories
- Webhook/source-event processing state
- Sync checkpoints and reconciliation runs
- AI task executions and proposal changes
- Capability assessment snapshots
- Professional-surface dependencies
- Résumé variants, sections, items and export snapshots
- Prompt, model and rule registries

### Preconfigured V1 extension points

- `integrations.provider`
- provider/external IDs on evidence
- source events and sync runs
- AI proposals and field-level changes
- approval/audit events
- rule-version fields
- queues and cron infrastructure
- claim/evidence traceability

### Migration sequence

1. Add V2 tables and indexes.
2. Deploy code capable of reading both absent and present V2 records.
3. Enable manual GitHub connection for the owner.
4. Import provider metadata privately.
5. Reconcile imported objects with existing evidence.
6. Enable AI proposal generation behind an owner-only flag.
7. Validate approval and rollback behavior.
8. Enable résumé generation only after claim traceability passes.

No existing capability or claim is automatically upgraded because new GitHub metadata appears.

## 6. V2 → V3 evolution

### Additive entities

- Target roles
- Job descriptions and source metadata
- Normalized job requirements
- Requirement-to-capability matches
- Requirement-to-evidence matches
- Gap and next-evidence recommendations
- Interview preparation packs and private practice notes
- Search chunks, embeddings and embedding versions
- Retrieval sessions and cited-answer records
- Knowledge/evidence graph projections

### Preconfigured extension points

- Canonical skills and aliases
- Bounded capabilities
- Evidence quality and recency
- Approved claims
- Versioned assessments
- Provider-neutral background jobs
- Authorization-aware search boundary

### Migration sequence

1. Add private career-intelligence tables.
2. Introduce job parsing as proposals.
3. Require owner confirmation of normalized requirements.
4. Generate explainable match states from approved evidence.
5. Add semantic index in shadow mode.
6. Compare semantic and lexical results using evaluation fixtures.
7. Enable private semantic search.
8. Enable public Ask My Portfolio only after privacy and citation gates pass.

V3 must not change canonical capabilities or claims merely because a job description requests a technology.

## 7. V3 → V4 evolution

V4 is conditional and requires a separate product decision.

### Potential additive entities

- Tenants/workspaces
- Memberships and roles
- Tenant configuration and branding
- Connector installations
- Template libraries
- Usage metering
- Plans, subscriptions and billing records if SaaS is selected
- Tenant export/deletion requests
- Administrative audit and support-access records

### Required architectural review

- Tenant isolation threat model
- D1 database-per-tenant versus shared-partition strategy
- R2 tenant key isolation
- Cloudflare Access replacement or extension for customer authentication
- Queue isolation and noisy-neighbor controls
- Per-tenant encryption/key policy
- Billing and abuse controls
- Data residency and regulatory obligations
- Support access and impersonation safeguards
- Tenant-specific backup, export and deletion SLAs

### Productization rule

Do not add a nullable `tenant_id` everywhere during early V1. Instead, keep `owner_id` explicit, centralize authorization and keep repositories tenant-context-ready. V4 performs a deliberate migration after the isolation strategy is approved.

## 8. Schema migration policy

### Expand-and-contract

1. Add new column/table/index.
2. Deploy dual-compatible application code.
3. Backfill data.
4. Verify counts, checksums and behavior.
5. Switch reads.
6. Switch writes.
7. Observe through at least one release cycle.
8. Retire old structure only through a later approved migration.

### Prohibited practices

- Editing an applied migration
- Destructive table/column removal in the same release as replacement
- Unversioned JSON shape changes
- Silent enum reinterpretation
- Backfills that call paid AI without explicit approval/budget
- Deleting original provenance after normalization

## 9. Backfill standard

Every backfill has:

- Stable job name and version
- Idempotency key
- Eligibility query
- Batch/cursor strategy
- Dry-run mode
- Expected counts
- Progress and error metrics
- Retry and resume behavior
- Before/after validation
- Rollback or repair procedure
- Audit event

Backfills write derived records first. They do not overwrite canonical text unless the owner approves a specific transformation.

## 10. API versioning

- Initial API prefix: `/api/v1`.
- Additive response fields do not require a new major version.
- Removing/renaming fields, changing meaning or changing authorization requires a new major version.
- Clients ignore unknown additive fields.
- Error codes are stable and documented.
- Every mutation supports optimistic concurrency.
- Webhook and queue messages have independent envelope schema versions.
- Public URLs remain stable; slug changes create permanent redirects.

## 11. Content-schema versioning

Structured content blocks store a schema version. Readers support current and previous supported versions. Migration produces a new immutable revision, preserving the original snapshot. Markdown export remains available even if the internal block representation changes.

## 12. Rule and model versioning

The following derived output records their generator version:

- Capability maturity
- Evidence quality signals
- Duplicate suggestions
- Claim suggestions
- Résumé tailoring
- Job requirement extraction
- Job/evidence matches
- Gap recommendations
- Search chunks and embeddings
- Ask My Portfolio answers

Changing a rule does not overwrite previous results. It creates a new assessment/proposal and marks earlier derived results superseded where appropriate.

## 13. Feature flags

Feature flags are server-controlled, environment-aware and owner-only in V1–V3.

Required flags include:

- GitHub connection
- GitHub webhook ingestion
- AI metadata proposals
- Capability assessment proposals
- Résumé generation
- Job parsing
- Career matching
- Semantic indexing
- Private Ask My Portfolio
- Public Ask My Portfolio
- Knowledge graph

Flags control route exposure, job scheduling and UI—not authorization. Disabled features do not run background jobs or incur AI cost.

## 14. Rollout stages

1. **Code dark:** deployed but inaccessible.
2. **Owner preview:** available only in local/staging.
3. **Shadow:** computes output without affecting canonical data.
4. **Private beta:** owner can inspect and approve proposals.
5. **Limited public:** explicitly selected public output only.
6. **General:** default behavior after acceptance gates.

## 15. Rollback strategy

- Application deployments retain a last-known-good version.
- Public static output remains available during database/service failure.
- Feature flags disable new jobs and routes immediately.
- Queue consumers tolerate old and new message versions during rollout.
- Schema rollback uses forward repair; destructive down migrations are avoided.
- Derived V2/V3 records can be archived without touching V1 canonical evidence.
- Backups are taken before production migrations and validated through restore rehearsal.

## 16. Deprecation policy

1. Announce deprecation in documentation and code annotations.
2. Add telemetry that does not capture private content.
3. Provide replacement and migration path.
4. Support at least one release cycle of dual behavior.
5. Migrate and verify all active records.
6. Remove only after zero active dependency is confirmed.
7. Preserve export readability for retired schemas.

## 17. Compatibility test matrix

- Fresh database → current release
- V1 database → V2 release
- V2 database → V3 release
- Previous app release against expanded schema
- New app release before backfill completion
- Old queue message processed by new consumer
- New queue message safely rejected/deferred by old consumer
- Content from previous schema rendered/exported
- Feature disabled during queued work
- Failed migration followed by forward repair
- Backup from previous version restored and upgraded
- Private visibility preserved across every migration
- Evidence/claim traceability preserved across every migration

## 18. Data ownership across versions

Every version continues to support:

- Complete owner export
- Markdown content export
- SQLite/SQL and JSON structured export
- R2 artifact manifest and checksums
- Schema/version README
- Provider-independent evidence provenance
- Explicit deletion/retention behavior

V4 tenant features must provide equivalent per-tenant ownership and portability.

## 19. Version exit gates

### V1 exit gate

Canonical evidence/identity works, portability is proven, security passes and V1 functions without AI.

### V2 exit gate

Automation produces grounded proposals, GitHub sync is idempotent and résumés remain traceable to approved claims/evidence.

### V3 exit gate

Career matches are explainable, semantic retrieval respects authorization and every generated answer cites approved evidence or says evidence is insufficient.

### V4 entry gate

Demand is validated and tenant isolation, authentication, operations, support, billing choice, export and deletion are formally designed.

## 20. Approval decision

Approval makes cross-version compatibility a release requirement. A feature is not complete if it works only on a fresh database, cannot be disabled safely, loses provenance, breaks old exports or requires canonical data to be re-entered.
