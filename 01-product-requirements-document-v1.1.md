PRODUCT REQUIREMENTS DOCUMENT
usmanalii.com
Personal Career OS & Evidence-Backed Professional Identity System
One canonical record of learning, engineering work, evidence, capabilities, projects, professional claims, and career direction—published through controlled, evidence-backed views.
Document status
Updated implementation baseline
Product owner
Usman Ali
Primary domain
usmanalii.com
Version
1.1
Date
8 August 2026
Release focus
V1 Foundation — lifetime-free architecture + cinematic UI

1. Executive summary
   usmanalii.com is a personal Career Operating System: a continuously evolving, evidence-backed professional identity that records what Usman learns, proves what he builds, connects skills and capabilities to verifiable evidence, and generates controlled portfolio, résumé, recruiter, and career-intelligence views from one approved source of truth.
   The product is not a conventional portfolio, résumé builder, generic blog, or automated GitHub mirror. Its core asset is the Evidence Ledger: an append-oriented record of evidence items, provenance, ownership, visibility, verification state, and the claims and capabilities each item can legitimately support. The five product pillars are fixed: Learning Journey & Engineering Journal; Evidence & Skills Graph; Projects & Engineering Record; Professional Identity Engine; and Career Intelligence.
   V1 establishes the trustworthy foundation: public site, authenticated private dashboard, structured journal, evidence ledger, skills/capabilities, project case studies, manual GitHub linking, activity heatmap, professional profile, recruiter/deep-dive views, search, privacy controls, and export. Later releases add synchronization, AI-assisted enrichment, résumé generation, career matching, semantic retrieval, and productization. All AI output is advisory and draft-only until explicitly approved by the owner.
   1.1 Product thesis
   A professional assertion is more credible and more maintainable when it is derived from a canonical record and linked to evidence. Learning notes become engineering memory; implementations become artifacts; artifacts support capabilities; capabilities support approved claims; claims populate professional surfaces. Career analysis then compares target-role requirements against the same record and recommends the next evidence to create.
   1.2 Product flywheel
   Learn → document
   Code / experiment → build
   Ship → create evidence
   Review evidence → strengthen capabilities
   Approve claims → update portfolio and résumé
   Compare against target roles → identify the next evidence gap
   Repeat without fragmenting professional identity
   1.3 Requirement language
   “Must” denotes release-blocking behavior. “Should” denotes expected behavior that can be deferred only with a documented decision. “May” denotes optional behavior. Requirement IDs are stable references for design, implementation, tests, and release sign-off.
2. Problem, opportunity, and vision
   2.1 Problem statement
   Learning history is scattered across notebooks, repositories, bookmarks, posts, and memory; it cannot be searched as a coherent engineering journey.
   GitHub proves activity but often lacks the narrative needed to explain intent, decisions, understanding, contribution, and outcomes.
   Portfolio pages, résumé variants, social profiles, and project descriptions drift because each is maintained separately.
   Skills are commonly presented as unverifiable keywords or arbitrary percentage bars; neither communicates what a person can actually do.
   Career advice frequently recommends technologies without evaluating existing evidence, depth, recency, or target-role requirements.
   Automation can silently manufacture polished but false professional facts unless provenance and human approval are first-class controls.
   2.2 Vision
   Make usmanalii.com the most trustworthy, useful, and durable representation of Usman Ali’s professional development: a public proof system, a private engineering memory, and a decision-support layer for career growth.
   2.3 Product principles
   Principle
   Operational meaning
   Evidence before assertion
   Every published professional claim must have at least one approved supporting evidence link or be explicitly labeled as owner-authored background.
   Human authority
   AI may extract, summarize, classify, rank, or propose; it cannot publish, alter canonical facts, or create employment/education facts without approval.
   One source, many views
   Portfolio, recruiter view, deep dive, résumé, and career analysis read from the same canonical records and approved claims.
   Progress over vanity
   Show chronology, depth, context, and outcomes; never use arbitrary skill percentages or activity streaks as competence proxies.
   Provenance is data
   Source, authorship, timestamps, import method, repository references, checksums, and edit history are retained.
   Privacy by default
   Imported and AI-suggested items start private; field-level visibility is explicit and previewable.
   Owner-controlled portability
   Content and evidence can be exported in open formats; the system must not trap the owner.
   Explainable intelligence
   Scores and recommendations expose matched evidence, gaps, weights, and uncertainty.
   Accessible depth
   A recruiter can understand the profile quickly; a technical visitor can inspect underlying evidence and decisions.

3. Goals, non-goals, and success definition
   3.1 Goals
   Capture a structured chronological learning and engineering record with low authoring friction.
   Maintain an auditable Evidence Ledger connecting sources, artifacts, skills, capabilities, claims, projects, and professional views.
   Publish credible public pages with fast recruiter scanning and optional technical deep dives.
   Make skill progression dynamic and evidence-based using breadth, depth, recency, independence, and outcomes—not self-rated percentages.
   Allow approved changes to update every dependent portfolio/résumé surface predictably.
   Support privacy-aware search, export, backup, and future integrations.
   Provide a clean path from V1 foundation to AI automation and career intelligence without schema replacement.
   3.2 Non-goals
   A social network, community publishing platform, job board, applicant tracking system, or general-purpose CMS in V1.
   Automatic claims of mastery, automatic publication, AI-authored professional history, or hidden scoring.
   A replacement for GitHub source control, LinkedIn distribution, or authoritative educational/employment records.
   Gamification based on daily streaks, commit count alone, follower counts, or arbitrary skill bars.
   Multi-tenant SaaS, payments, teams, comments, public user accounts, or open author registration before V4.
   Continuous ingestion of private repository source code in V1.
   3.3 North-star outcome
   A visitor can verify what Usman can do and why; Usman can find what he learned, reuse approved facts without inconsistency, and identify the most valuable next evidence to create.
4. Audiences and personas
   Persona
   Primary job
   Needs
   Owner / author
   Capture, curate, connect, approve, publish, export, and privately analyze the record.
   Trust, low friction, control, durable memory.
   Recruiter / hiring manager
   Assess fit in 30–90 seconds, download an appropriate résumé, then inspect proof.
   Clarity, relevance, authenticity, contact path.
   Technical evaluator
   Inspect architecture, code, ADRs, experiments, debugging lessons, tradeoffs, and contribution.
   Depth, provenance, concrete outcomes.
   Peer / learner
   Follow the learning journey and reuse explanations.
   Readable teaching, chronology, related concepts.
   Search engine / assistant
   Index only explicitly public, canonical content.
   Structured metadata, stable URLs, no private leakage.
   Future platform user (V4)
   Operate an isolated instance of the same system.
   Tenant isolation, onboarding, templates, portability.

5. Domain semantics: claims, evidence, skills, and capabilities
   These concepts must remain separate in UI, schema, APIs, scoring, and AI prompts.
   Concept
   Definition and constraint
   Evidence
   A verifiable record that something occurred or was produced: commit, pull request, deployed URL, artifact, journal entry, experiment result, certificate, work sample, or owner-attested record. Evidence has provenance and does not itself assert competence.
   Skill
   A named knowledge or technology domain used for organization and discovery, such as Python, NumPy, system design, or linear algebra. A skill is a taxonomy node—not a claim of proficiency.
   Capability
   A bounded, action-oriented ability supported by evidence, such as “implements and explains matrix transformations with NumPy” or “deploys containerized APIs.” Capabilities may have evidence-derived maturity states.
   Claim
   An owner-approved statement intended for a professional surface, such as “Built and deployed X” or “Designed Y.” A claim has audience, context, supporting evidence, and review status.
   Artifact
   A produced object such as source file, diagram, notebook, dataset, demo, document, screenshot, package, release, or deployment.
   Activity
   A dated event used for chronology and the heatmap. Activity indicates work occurred; it is not equivalent to evidence quality or capability strength.

5.1 Capability maturity (descriptive, not percentage-based)
Stage
Minimum interpretation
Observed
Evidence shows exposure or guided use.
Practiced
Repeated implementations or exercises exist.
Applied
Used in a meaningful project or real problem.
Delivered
Shipped, deployed, adopted, or otherwise produced an outcome.
Sustained
Multiple independent, recent, and varied examples demonstrate repeatability.
Not enough evidence
The system cannot responsibly infer a stage.

Stage changes are suggestions until approved. A higher stage requires qualifying evidence; absence of recent evidence may reduce confidence or mark the capability “stale,” but must not silently rewrite history. 6. Information architecture
6.1 Public routes
Route
Purpose
/
Professional overview; current focus; featured proof; recent journey; featured projects; capabilities; activity; contact CTAs.
/journey
Chronological learning and engineering journey with filters and heatmap.
/journey/[slug]
Note, journal, deep dive, or retrospective; related evidence, code, skills, projects, and next/previous.
/skills
Searchable skill/capability graph and evidence-backed summaries.
/skills/[slug]
Definition, capabilities, maturity rationale, evidence timeline, related projects and content.
/projects
Featured and all projects; filters by domain, status, capability, and date.
/projects/[slug]
Full engineering case study and project history.
/evidence/[publicId]
Public evidence detail/provenance page for publishable evidence.
/activity
GitHub-style activity calendar with accessible list alternative and day drill-down.
/about
Professional narrative, education/work records selected for public display, principles, and direction.
/resume
Approved résumé variants; web preview and controlled download.
/recruiter
Concise role-oriented view with proof links and contact action.
/deep-dive
Technical map emphasizing projects, architecture, ADRs, experiments, and debugging lessons.
/search
Privacy-safe lexical search; semantic results added in V3.
/ask
Public Ask My Portfolio in V3; answers only from public approved records with citations.
/privacy
Privacy policy, data use, and contact details.
/sitemap.xml, /robots.txt, feeds
Machine-readable public discovery surfaces.

6.2 Private routes
Route
Purpose
/dashboard
Health, drafts, suggestions, pending approvals, sync status, recent activity, and quick capture.
/dashboard/inbox
Unified ingestion queue for GitHub events, uploads, imports, and AI suggestions.
/dashboard/journal
Create/edit entries, templates, scheduling, preview, versions, and relationships.
/dashboard/evidence
Ledger list, filters, deduplication, provenance, links, verification, and visibility.
/dashboard/skills
Taxonomy, aliases, capability definitions, evidence mapping, suggested stage changes.
/dashboard/projects
Project records, milestones, artifacts, experiments, ADRs, debugging lessons, releases, case-study preview.
/dashboard/profile
Canonical biography, contact, education, experience, certifications, links, current focus.
/dashboard/claims
Claim library, support health, audience, expiry/review date, and usage locations.
/dashboard/resumes
Variant definitions, tailoring, diff, evidence validation, preview, export.
/dashboard/career
Target roles, job descriptions, requirement mapping, gaps, recommendations, and interview packs.
/dashboard/search
Private full-record search and V3 semantic retrieval.
/dashboard/activity
Activity reconciliation, excluded events, manual events, and heatmap policy preview.
/dashboard/approvals
Review AI/import proposals with source comparison, confidence, impacted surfaces, approve/edit/reject.
/dashboard/integrations
GitHub connection, repository scope, webhook/sync status, permissions, disconnect/export.
/dashboard/settings
Privacy defaults, field visibility, SEO, analytics consent, exports, backups, security sessions, deletion.

7. Public experience requirements
   7.1 Global shell and modes
   PUB-001 — All public pages must share accessible navigation, global search, mode switch, résumé/contact actions, and a visible “last reviewed” signal where claims are material.
   PUB-002 — Recruiter mode must prioritize role, selected capabilities, quantified/qualified outcomes, featured projects, résumé, and contact; default scan path must work in under 90 seconds.
   PUB-003 — Deep-dive mode must reveal engineering detail without duplicating records: architecture, artifacts, ADRs, experiments, failures, debugging lessons, source links, and provenance.
   PUB-004 — Mode is a view preference encoded in URL or cookie; it must not alter underlying visibility permissions.
   PUB-005 — Every public claim must expose “View evidence” when supporting evidence is public. When evidence is private, the claim may publish only if explicitly approved and must show a non-sensitive support label such as “verified private work sample.”
   7.2 Home
   HOME-001 — Display name, truthful current positioning, short evidence-backed summary, current focus, primary actions, and mode choice.
   HOME-002 — Show featured capabilities with descriptive maturity labels and evidence counts/types; do not show percentage proficiency.
   HOME-003 — Show featured projects, latest journey entries, and an activity summary drawn from publishable records.
   HOME-004 — Provide a compact “proof at a glance” section: selected delivered capabilities, project outcomes, public artifacts, and recent evidence.
   HOME-005 — Empty modules must collapse or display a curated owner message; never fabricate filler content.
   7.3 Journey and entry
   JRN-001 — Index must support year/month chronology, content type, topic, skill, project, and status filters.
   JRN-002 — Entry types are Note, Journal, Deep Dive, and Retrospective; each has a shared base model and optional type-specific sections.
   JRN-003 — Entry detail supports summary, motivation, understanding, mental model, implementation, code, diagrams, confusion, mistakes, breakthrough, lessons, related concepts, related evidence, and next step.
   JRN-004 — Entries show published/updated dates, reading time, revision indicator, tags, previous/next, and canonical URL.
   JRN-005 — GitHub/code references must identify repository, ref/commit where available, path, and last verified status; broken links degrade visibly.
   JRN-006 — Draft, scheduled, archived, unlisted, and public states must be enforced server-side.
   7.4 Skills and capabilities
   SKL-001 — Index supports taxonomy browsing, keyword search, domains, related skills, and capability filters.
   SKL-002 — Detail separates “What this skill is” from “What Usman can do with it.”
   SKL-003 — Capability cards show maturity label, rationale, evidence mix, first/last evidence, recency, project use, and limitations.
   SKL-004 — Evidence counts alone cannot determine ordering or maturity. Default ranking combines approved editorial priority and qualifying evidence diversity.
   SKL-005 — Skill history shows dated supporting events without implying uninterrupted mastery.
   7.5 Projects and engineering case studies
   PRJ-001 — Project cards include status, concise problem/outcome, owner role, selected technologies, proof links, live/demo status, and last meaningful update.
   PRJ-002 — Case studies must support: Problem; context; role and actual contribution; constraints; requirements; solution; architecture; technology choices; implementation; experiments; ADRs; debugging lessons; security/privacy decisions; testing; deployment; outcomes; limitations; evidence; related journey; future improvements; version history.
   PRJ-003 — Project timeline events include idea, prototype, milestone, architecture change, release, incident, fix, deployment, and retrospective.
   PRJ-004 — Each outcome must distinguish measured result, observed result, and subjective lesson. Unsupported metrics must not publish.
   PRJ-005 — Contributions must distinguish solo work, team role, reused/open-source components, and employer/client confidentiality.
   PRJ-006 — Dead demos or unavailable repositories must show a clear status and retain the historical record.
   7.6 Activity, search, résumé, and Ask My Portfolio
   ACT-001 — Heatmap shows meaningful public activity across content, evidence, projects, and selected GitHub events; it is a history index, not a competence score.
   ACT-002 — Keyboard and screen-reader users receive an equivalent date-grouped list with counts and links.
   SRC-001 — Public search indexes only public, approved, non-embargoed content and returns results grouped by journey, project, capability, evidence, and profile.
   RES-001 — Resume page exposes only active approved variants and provides web, PDF, and print-safe views.
   ASK-001 (V3) — Answers must cite public canonical records, state when evidence is insufficient, resist prompt injection in indexed content, and never reveal private data.
8. Private dashboard functional requirements
   8.1 Dashboard and capture
   ADM-001 — Dashboard shows pending approvals, unresolved imports, stale/broken evidence, unpublished drafts, scheduled items, sync failures, and data-health warnings.
   ADM-002 — Quick capture accepts note, evidence URL, artifact upload metadata, activity, project update, or inbox item with private visibility by default.
   ADM-003 — Autosave, optimistic editing, recovery from failed saves, and visible save state are required.
   ADM-004 — Command/search palette may accelerate navigation but all actions remain available through standard UI.
   8.2 Journal authoring
   EDT-001 — Structured editor supports MDX-compatible rich text, code blocks, embeds, diagrams/images with alt text, callouts, headings, references, and reusable templates.
   EDT-002 — Editor provides relationship selectors for skills, capabilities, projects, evidence, artifacts, and related entries.
   EDT-003 — Preview must render the exact public mode and reveal privacy conflicts before publish.
   EDT-004 — Publish validation checks title, slug, summary, visibility, metadata, broken internal references, image alt text, and content sanitization.
   EDT-005 — Every publish creates a revision; rollback creates a new revision rather than deleting history.
   8.3 Evidence Ledger management
   EVD-001 — Ledger supports manual creation, URL capture, GitHub import, artifact association, and future connector imports.
   EVD-002 — Evidence record must expose source, source locator, source timestamps, captured timestamp, author/owner, verification state, visibility, integrity metadata, and relationships.
   EVD-003 — Potential duplicates are grouped using source identity, repository/ref/path, canonical URL, or checksum; merges preserve all provenance.
   EVD-004 — Owner can accept, edit, reject, archive, or mark evidence invalid. Deletion requires dependency review and audit logging.
   EVD-005 — Evidence verification states: unreviewed, owner-verified, source-verified, stale, broken, disputed, archived.
   EVD-006 — Evidence can support multiple capabilities and claims; link records store support type, strength rationale, owner note, and approval.
   8.4 Skills, capabilities, claims, and projects
   CAP-001 — Owner manages canonical skills, aliases, domains, parent/child relations, and deprecated/merged nodes.
   CAP-002 — Capability is written as an observable action and must define qualifying evidence rules.
   CAP-003 — Suggested maturity changes show previous state, proposed state, evidence delta, rule explanation, confidence, and affected public surfaces.
   CLM-001 — Claims have text, context, audience, status, review date, visibility, evidence links, and usage references.
   CLM-002 — Publishing blocks unsupported claims unless owner deliberately marks an allowed “owner-authored background statement”; this exception cannot be used for quantified outcomes, credentials, employment, or delivered work.
   PRV-001 — Project workspace manages members/roles, milestones, artifacts, experiments, ADRs, debugging lessons, releases, deployments, evidence, and case-study sections.
   8.5 Approvals and change impact
   APR-001 — Approval queue groups proposals by origin and shows source material beside proposed changes.
   APR-002 — A proposal contains field-level before/after, model/rule version, confidence, citations, privacy risk, and dependent surfaces.
   APR-003 — Actions are approve, approve with edits, reject with reason, defer, or bulk reject; bulk approval is allowed only for low-risk metadata fields explicitly configured by owner.
   APR-004 — Approval is transactional: either all selected canonical changes and dependency updates succeed or none do.
   APR-005 — Published-surface changes require preview and explicit confirmation even when underlying metadata was previously approved.
   APR-006 — Audit history records actor, action, timestamp, proposal, previous value, new value, and reason.
9. Content and evidence model
   9.1 Shared content lifecycle
   State
   Meaning
   Allowed transition
   draft
   Private editable working record.
   review, archived
   review
   Ready for owner validation.
   draft, approved, archived
   approved
   Canonical but not necessarily public.
   published, draft via revision, archived
   scheduled
   Approved with future publication time.
   published, approved, archived
   published
   Visible according to visibility policy.
   updated via revision, unlisted, archived
   unlisted
   Accessible only by direct URL; excluded from discovery.
   published, archived
   archived
   Retained, not active.
   draft or approved after restore

9.2 Evidence provenance fields
Field group
Requirement
source_type
manual, GitHub, URL, upload, deployment, education, employment, certificate, future connector
source_id / external_id
Stable provider identity used for idempotency
source_locator
Canonical URL, repo/ref/path, provider object locator, or protected internal locator
source_created_at / updated_at
Provider timestamps, not import timestamps
captured_at
When system first recorded it
content_hash
Integrity and duplicate-detection hint for captured content or artifact metadata
authorship
owner, collaborator, team, third party, unknown; includes contribution note
verification
State, verifier, method, time, and expiry/review date
visibility
private, restricted, unlisted, public; plus embargo and field overrides
provenance_snapshot
Minimal immutable source metadata needed to explain origin
license / confidentiality
Reuse and publication constraints
quality signals
Outcome, independence, depth, recency, diversity; each explainable and nullable

9.3 Evidence support semantics
“Demonstrates” requires direct implementation, delivery, explanation, or outcome evidence.
“Corroborates” adds context but is insufficient alone, such as a commit count or topic tag.
“Contradicts/invalidates” flags a claim or relationship for review.
“Historical” proves past activity but may be stale for current capability assessment.
Private evidence may support an approved public claim only under a privacy-safe label and must never be disclosed through search, APIs, logs, or AI context. 10. Relational data model
Cloudflare D1 (SQLite semantics) is the V1 system of record. UUID-compatible text primary keys, created_at, updated_at, created_by, and soft-delete/archive fields are standard unless stated otherwise. D1 is accessible only through the trusted Cloudflare Worker API; owner authorization and visibility policy are enforced centrally before every query. Public reads use explicit publishable projections and static-build outputs, never direct database access.
Entity
Purpose
Key relationships
users / profiles
Owner identity, canonical biography, contact, positioning, preferences.
1:N content, claims, resumes, integrations
content_items
Shared base for journal/case-study pages: type, title, slug, summary, body/structured blocks, state, visibility, dates, SEO.
N:M skills, projects, evidence; 1:N revisions
content_revisions
Immutable snapshots and change metadata.
N:1 content_item
skills
Taxonomy node, aliases, domain, parent, description, status.
N:M capabilities, evidence, content, projects
capabilities
Action-oriented ability, definition, maturity, confidence state, review date.
N:M evidence; N:M claims
projects
Problem, role, status, dates, outcomes, visibility, featured rank.
1:N milestones, artifacts, experiments, ADRs, lessons, deployments
project_events
Typed chronology event with date, summary, related evidence.
N:1 project
artifacts
Produced object metadata, storage/external locator, media type, checksum, license, visibility.
N:M projects/content/evidence
evidence_items
Ledger record and provenance/verification core.
N:M capabilities, claims, projects, content, activities
evidence_links
Typed support edge between evidence and a target entity.
Stores role, rationale, strength, approval
claims
Approved professional assertion with audience, status, review date.
N:M evidence; N:M surfaces/resume items
activities
Dated normalized event, source, weight category, visibility, dedupe key.
May link to evidence/content/project
experiments
Hypothesis, method, variables, result, interpretation, limitations.
N:1 project; N:M artifacts/evidence
adrs
Decision, context, options, outcome, consequences, status.
N:1 project; N:M evidence
debugging_lessons
Symptom, context, investigation, root cause, fix, prevention.
N:1 project; N:M evidence
deployments / releases
Environment, version, URL, status, dates, rollback info.
N:1 project; N:M evidence
resume_variants
Target role/audience, template, status, settings.
1:N resume_sections/items/exports
resume_items
Snapshot/reference to approved claim/content with ordering and tailoring.
N:1 variant; N:M claims/evidence
target_roles / jobs
Role profile or pasted job description, source, privacy, status.
1:N requirements/matches
job_requirements
Normalized requirement, category, importance, years/level if explicit.
N:M capabilities/evidence via matches
requirement_matches
Match state, evidence links, rationale, confidence, owner decision.
N:1 requirement
ai_proposals
Draft change, source refs, model/prompt/rule version, confidence, risk, state.
1:N proposal_changes/approval_events
integrations
Provider connection metadata and encrypted credential reference.
1:N sync_runs/webhook_events
audit_events
Append-only security and canonical-change audit.
Actor + entity + action + before/after refs
visibility_policies
Reusable access rules and field overrides.
Applied to publishable entities
exports / backups
Requested package, scope, format, checksum, expiry.
N:1 owner

10.1 Critical join tables
content_skills, content_projects, project_skills, project_artifacts
capability_skills, capability_evidence
claim_evidence, claim_capabilities, claim_surface_usage
evidence_artifacts, evidence_projects, evidence_activities
resume_item_claims, resume_item_evidence
requirement_capability_matches, requirement_evidence_matches
10.2 Integrity constraints
Unique owner + content type + slug among active records.
Unique provider + external_id for imported objects; webhook event IDs are idempotent.
Published claim requires approved state and at least one approved support link unless a permitted background-statement exception is recorded.
Public materialized/search records may reference only entities whose effective visibility is public and publication state is published.
Evidence deletion is restricted when referenced; archive/invalidate is preferred and cascades health warnings.
Maturity values use an enum; no numeric percentage proficiency column exists.
All D1 access occurs through parameterized repository methods in the Worker API; the browser receives no database credentials or direct binding. 11. Automation and event flows
11.1 Canonical event flow
Source event received or owner captures content.
Persist raw event metadata privately with idempotency key.
Normalize into candidate activity/evidence; detect duplicates and privacy constraints.
Run deterministic rules; optionally request AI extraction with only allowed context.
Create proposal(s), never canonical professional facts.
Owner reviews source, diff, confidence, and impacted surfaces.
On approval, transactionally update canonical entities and relationships.
Recompute derived capability health, claim support, heatmap aggregate, search index, and affected previews.
Publish only after separate surface approval when public output changes.
Write audit event; schedule link/provenance revalidation.
11.2 Portfolio update behavior
“Automated update” means dependency-aware propagation of owner-approved canonical data—not autonomous publication. If an approved project title changes, dependent previews refresh automatically. If an AI proposes a new claim, no public surface changes until the claim and its surface placement are approved. Removed or invalid evidence triggers a support warning and may unpublish only under an owner-configured safety rule; default behavior is to block future publication and request review. 12. GitHub integration
12.1 V1 behavior
OAuth/GitHub App connection is optional; manual public GitHub URL linking is supported without account connection.
Owner selects repositories explicitly. Default scope excludes private repositories and organizations.
V1 stores repository metadata and owner-selected links to commits, files, pull requests, releases, and deployments; it does not copy whole repositories.
Each link can be pinned to a commit SHA/ref and path for durable provenance.
The system checks accessibility and records last_verified_at, HTTP/provider status, and stale/broken state.
GitHub activity displayed publicly is limited to selected repositories and publishable normalized events.
12.2 V2 synchronization
Prefer GitHub App with least-privilege permissions; encrypt tokens and rotate/revoke on disconnect.
Webhooks enqueue repository, push, pull request, release, and deployment events; scheduled reconciliation catches missed events.
Sync uses cursor/checkpoint state, retry with backoff, dead-letter handling, and observable sync runs.
Commit volume alone is corroborating activity, never proof of capability. Merge commits, bots, generated files, dependency updates, and bulk history imports are excluded or down-weighted by policy.
Private-source metadata remains private and is not sent to third-party AI unless separately enabled with a clear data disclosure.
Repository removal stops future sync and offers retain-as-historical or archive/delete-imported-metadata choices after dependency preview.
12.3 Mapping rules
GitHub object
Candidate mapping
Human decision
Repository
Project or artifact source
Attach/create project; choose visibility
Commit
Activity; possible evidence when semantically meaningful
Link to capability/project; accept or ignore
Pull request
Evidence of contribution, review, design discussion
Confirm role and support type
Release
Release + evidence + project event
Confirm outcome and public notes
File/path
Artifact/source locator
Describe ownership and significance
Issue
Debugging lesson, project event, or requirement
Confirm confidentiality and interpretation
Deployment
Deployment record and delivered evidence
Confirm environment/outcome

13. AI-assisted workflow and guardrails
    13.1 Permitted AI tasks
    Suggest titles, summaries, tags, skills, relationships, content structure, and duplicate candidates.
    Extract candidate metadata and candidate requirements from owner-provided sources.
    Summarize approved evidence, propose bounded capabilities, draft claim wording, and explain match rationale.
    Generate résumé drafts and interview questions grounded in approved facts.
    Embed/index allowed records for semantic retrieval in V3.
    13.2 Prohibited AI behavior
    Invent employers, education, dates, credentials, responsibilities, project outcomes, usage metrics, customers, team size, authorship, proficiency, or technologies.
    Infer private facts from public activity or expose private content through generated output.
    Publish, approve, delete, change visibility, connect an integration, or submit an application autonomously.
    Treat a repository topic, package file, commit count, or mention as proof of competence.
    Convert uncertainty into certainty or conceal missing evidence.
    13.3 Proposal contract
    Every AI proposal stores: task type, model/provider, model version, prompt/template version, rule version, input entity IDs, source citations/locators, generated output, field-level confidence, uncertainty notes, privacy classification, risk level, token/cost metadata where available, created time, expiry, and review decision. Prompts and retrieved content are untrusted data; tool/action capabilities are not exposed to public Ask My Portfolio.
    13.4 Approval risk levels
    Risk
    Examples
    Rule
    Low
    Tags, aliases, formatting, non-public summary
    May allow configured batch approval; still reversible and audited.
    Medium
    Skill/capability links, project section drafts, search metadata
    Individual review with source comparison.
    High
    Professional claim, maturity change, résumé item, public visibility
    Explicit review, evidence validation, and impacted-surface preview.
    Critical
    Employment/education fact, quantified outcome, deletion, credential, private→public
    Never auto-approve; require direct owner confirmation and enhanced warning.

14. Activity heatmap specification
    14.1 Purpose and aggregation
    The heatmap is a navigational summary of documented learning and building. A cell represents qualifying activity on a calendar date in the owner’s configured timezone. Clicking a cell opens the public or private day ledger, respecting effective visibility.
    Qualifying categories: published journal/content, owner-approved evidence, meaningful project event, artifact, experiment, ADR, debugging lesson, release/deployment, and selected GitHub activity.
    Same underlying event may contribute once only. Dedupe uses source event ID and canonical activity/evidence relationships.
    Intensity uses configurable activity points solely for visualization: 0, 1, 2–3, 4–6, 7+ qualifying points. The legend says “documented activity,” never productivity or competence.
    Default category weights: published substantial content 2; project milestone/release/deployment 2; approved evidence/artifact/experiment/ADR/lesson 1; selected meaningful GitHub PR/release 1; raw commits are grouped daily and capped at 1.
    Bot events, generated files, dependency-only updates, merges without substantive changes, imports preserving old dates, drafts, rejected suggestions, and private events are excluded from the public heatmap.
    Date uses event occurred_at; imported_at is retained separately. Owner can correct date/source and exclude an event with reason.
    No streak badges, leaderboards, or negative messaging for inactive days.
    14.2 Acceptance rules
    Year view starts on Sunday or Monday according to locale and labels month/day semantics accessibly.
    Timezone changes trigger a preview before reaggregation.
    Public and private heatmaps may differ; public totals must never reveal hidden counts through tooltips, APIs, or side channels.
    Day drawer lists category, title, summary, and public link; no dead cells or inaccessible color-only meaning.
15. Professional Identity and résumé engine
    15.1 Canonical identity
    Profile, experience, education, credentials, projects, capabilities, links, and claims are canonical records. Public pages and résumé variants select and order approved records; they do not own divergent copies. Variant-specific phrasing is stored as an approved tailored claim linked to the canonical source.
    15.2 Resume generation pipeline (V2)
    Choose target role/audience and template.
    Select eligible approved claims and canonical records using explicit relevance rules.
    Validate evidence support, privacy, recency/review status, and conflicts.
    Draft ordering and concise phrasing; preserve factual qualifiers and quantified metrics exactly.
    Show traceability drawer for every bullet: source claim, evidence, canonical fields, and AI edits.
    Owner edits and approves each new tailored claim or bullet.
    Run lint: unsupported claims, duplicate claims, tense/date consistency, unexplained gaps only if configured, page length, links, accessibility, and contact privacy.
    Generate deterministic web/print/PDF export with version ID and snapshot.
    Later canonical changes mark affected résumé exports stale; historical exported snapshots remain auditable.
    15.3 Resume rules
    Never add a technology because it appears in the target job unless approved evidence supports its use.
    Never inflate verbs (for example, “led,” “architected,” “scaled”) without explicit support.
    Quantified results require a source and exact scope; otherwise use qualitative language.
    Private evidence may support a bullet only when the owner approves the disclosure level.
    ATS-friendly output is semantic text with standard headings; visual templates are optional, not the source of truth.
16. Career Intelligence
    16.1 Target-role and job matching (V3)
    Career Intelligence is private by default. It compares normalized job requirements against approved capabilities and evidence. It is decision support, not a prediction of hiring probability.
    Parse requirements into required/preferred, category, explicit seniority/years, responsibility, domain, and evidence expectation.
    Map aliases to canonical skills, then evaluate action-oriented capability matches.
    Match states: supported, partially supported, learning-only, stale, conflicting, missing, or not enough information.
    A supported match requires at least one qualifying evidence item consistent with requirement scope; keywords alone do not qualify.
    Overall fit is presented as an explainable coverage summary, not a single opaque percentage. If a summary score is offered, weights and every component must be visible and editable.
    Recommendations prioritize high-importance gaps, prerequisite relationships, evidence value, realistic effort, and the owner’s target timeline.
    “Next evidence” recommendations prefer demonstrable projects, artifacts, explanations, tests, deployments, or outcomes over collecting another tool name.
    16.2 Interview preparation
    Generate questions from the job requirements and the owner’s actual projects/capabilities.
    Create evidence-backed STAR/CAR outline candidates, clearly labeled drafts.
    Surface likely follow-ups, tradeoffs, limitations, failures, ADRs, debugging lessons, and areas where the honest answer is “learning/not yet demonstrated.”
    Provide an answer-evidence map and allow private notes; never invent stories.
    Track practice sessions separately from professional evidence unless owner promotes a real artifact.
17. Search and Ask My Portfolio
    17.1 Search
    V1 uses a build-time static search index for public content and indexed D1 queries for authenticated private search, with filters for type, skill, project, date, visibility, and content state.
    Public search reads only the sanitized public index; private search runs through the Access-authenticated Worker authorization layer.
    Synonyms and aliases come from the skill taxonomy; lightweight client-side fuzzy matching may improve typo tolerance.
    Results show matched snippet, type, date, related project/skill, and visibility in private mode.
    Index updates are event-driven and reconciled periodically; deletions and unpublishing purge public search artifacts immediately.
    17.2 Semantic search and Ask My Portfolio (V3)
    Chunk approved records along semantic section boundaries and retain entity/revision/visibility metadata.
    Embeddings are regenerated on revision; superseded chunks become inactive.
    Retrieval applies authorization before ranking and again before response assembly.
    Public Q&A uses only public approved chunks. Private Q&A is authenticated and must not mix scopes accidentally.
    Answers cite canonical pages/evidence, distinguish direct facts from synthesis, and respond “not enough evidence” when retrieval is insufficient.
    Indexed content and queries are untrusted; prevent prompt injection by separating instructions from retrieved text and disabling arbitrary tools/actions.
    Rate limits, abuse controls, query logging minimization, and owner-configurable retention are required.
18. Permissions, privacy, and security
    18.1 Visibility model
    Level
    Discovery
    Access
    private
    Not indexed or counted publicly.
    Owner only.
    restricted
    Not indexed.
    Owner and future explicit grant; V1 owner only.
    unlisted
    Excluded from lists/search/sitemap.
    Anyone with URL, subject to noindex.
    public
    Included according to publication state.
    Everyone.

Effective visibility is the most restrictive of entity, parent/project, artifact, evidence, embargo, and field-level policies.
Visibility changes show dependent entities and public surfaces before confirmation.
AI context builder and export builder use the same authorization service as UI/API.
Public aggregate counts are computed from public rows only; hidden existence must not be inferable.
18.2 Authentication and application security
Cloudflare Access protects the single-owner dashboard; use an allowlist for the owner identity and require strong authentication before private GitHub scope or sensitive export.
The Worker API validates the Access identity token, owner identity, entity ownership, effective visibility, and action permission on every request. D1 and R2 bindings are never exposed to the browser.
CSRF protection for mutations, secure cookies, origin checks, rate limiting, Cloudflare Turnstile on public forms/Ask, and strict input validation.
Sanitize rendered MDX/HTML; disallow arbitrary scripts, unsafe embeds, and untrusted executable code.
Encrypt provider tokens and sensitive configuration using Cloudflare secrets; secrets never enter client bundles, logs, analytics, or AI prompts.
R2 artifact uploads use allowlisted types, size limits, malware scanning where available, randomized object keys, signed/authorized delivery, and metadata stripping as appropriate.
Security headers: CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, frame-ancestors.
Audit authentication, integration, visibility, export, deletion, and canonical professional-fact changes. 19. SEO, accessibility, performance, and analytics
19.1 SEO
Server-render public pages with canonical URLs, unique titles/descriptions, Open Graph/Twitter cards, sitemap, robots policy, RSS/Atom feed for public journey, and stable redirects.
Use JSON-LD selectively: Person, WebSite, BlogPosting/TechArticle, CreativeWork/SoftwareSourceCode, BreadcrumbList. Do not encode unverified claims as structured data.
Draft/private/restricted/unlisted pages must be noindex and absent from sitemap.
Slugs are stable; changes create permanent redirects and preserve backlinks.
19.2 Accessibility
Target WCAG 2.2 AA. Keyboard navigation, visible focus, skip links, semantic landmarks, correct heading order, accessible forms/errors, and reduced-motion support are release requirements.
Heatmap, graphs, skill relationships, and architecture visuals need text/table alternatives; never rely on color alone.
Code blocks are keyboard-scrollable and labeled; diagrams/images require alt text or detailed descriptions.
Generated PDFs must have selectable text, logical reading order, adequate contrast, and meaningful link text.
19.3 Performance and reliability targets
Target
V1 threshold
Core Web Vitals (75th percentile)
LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on public pages
Availability
99.9% monthly target excluding planned maintenance
Public API/page reads
p95 server response ≤ 500 ms for cached/common reads
Search
p95 ≤ 700 ms for typical public/private lexical query
Dashboard mutation
Visible confirmation ≤ 1 s; durable background completion status
Error budget
Define alerts for availability, failed publishes, sync queue age, and backup failure

19.4 Analytics
Use privacy-respecting Cloudflare Web Analytics. Do not add session replay or third-party behavioral tracking by default.
Track page view, mode selected, project/evidence viewed, résumé download, search query category (not raw sensitive query by default), outbound GitHub/demo click, contact action, and owner publish funnel.
Do not send private dashboard content, job descriptions, drafts, evidence text, email, or AI prompts to product analytics.
Success dashboards separate public engagement from owner workflow health; vanity traffic is secondary to proof engagement and maintenance efficiency. 20. Error, loading, and empty states
State
Required behavior
No public content
Explain the site is being built; show approved profile/contact only. Never seed fake projects.
No evidence for skill
Show “No approved evidence yet” and hide maturity; private view offers attach/capture action.
Broken source
Retain record with warning, last verified date, alternate artifact if available, and owner repair queue.
GitHub disconnected
Keep historical approved records, stop sync, mark live metadata stale, and offer reconnect.
Sync delayed/rate limited
Show last successful sync, retry state, and no false “up to date” label.
AI unavailable
Core create/edit/publish workflows continue; proposals remain queued or can be completed manually.
Search no results
Show applied filters, spelling/alias suggestions, and clear-filter action without leaking private matches.
Publish conflict
Block and identify private dependencies, unsupported claims, invalid slug, or broken required artifact.
Save failure/offline
Preserve local draft, show retry/export text, and prevent silent data loss.
404/removed public record
Return truthful status and related active content; use 410 where intentionally removed.
Unauthorized
Generic response; do not reveal whether private entity exists.
Export/backup failure
Retain request metadata, surface retry/support detail, and alert owner after repeated failure.

21. API and integration architecture
    21.1 API conventions
    Astro server endpoints and a Hono-based Cloudflare Worker API expose typed domain services; the browser must never access D1 or R2 bindings directly.
    Use Zod validation, generated/shared TypeScript types, stable error codes, request IDs, pagination cursors, and idempotency keys for imports/webhooks.
    Public pages are statically generated wherever possible; dynamic public reads are cacheable and source data exclusively from publishable projections.
    Mutation endpoints require the validated Cloudflare Access owner identity, CSRF/origin checks, authorization, optimistic concurrency/version token, and audit event.
    Cloudflare Queues/Cron workers handle imports, link checks, AI proposals, indexing, exports, image processing, notifications, and aggregates.
    Webhooks verify signatures, persist minimal raw metadata safely, acknowledge quickly, and process asynchronously.
    21.2 Suggested service boundaries
    Service/module
    Responsibilities
    Content
    Journal, pages, revisions, slugs, publication, rendering
    Evidence
    Ledger, provenance, artifacts, verification, support links
    Capability
    Taxonomy, maturity rules, evidence health
    Project
    Projects, events, experiments, ADRs, lessons, deployments
    Identity
    Profile, claims, surfaces, recruiter/deep-dive projections
    Resume
    Variants, traceability, validation, render/export
    Career
    Jobs, requirements, matches, recommendations, interview packs
    Integration
    GitHub auth, webhook intake, sync/reconciliation
    Automation
    Proposal generation, approval, propagation, audit
    Search
    Lexical/semantic indexing and authorized retrieval
    Policy
    Visibility, field redaction, public projections, AI/export context
    Observability
    Structured logs, metrics, tracing, alerts, job dashboards

22. Recommended stack and deployment
    22.1 Stack
    Layer
    Recommendation
    Application
    Astro with TypeScript strict mode. Static-first rendering; server rendering only for authenticated or genuinely dynamic routes.
    Interactive UI
    React islands for dashboard widgets, evidence graphs, heatmap, filters, and 3D experiences.
    Visual system
    Tailwind CSS, CSS custom-property design tokens, accessible headless primitives used selectively.
    Motion / 3D
    Motion for React for springs and transitions; Three.js + React Three Fiber for one focused WebGL scene and evidence visualizations.
    Content
    Structured D1 records with Markdown/MDX-compatible import/export and a strict rendering component allowlist.
    Database
    Cloudflare D1 using SQLite semantics; indexed, migration-controlled, accessed only through Worker bindings.
    Authentication
    Cloudflare Access for the single-owner private dashboard; application-level authorization in the Worker API.
    Files
    Cloudflare R2 for images, PDFs, exports, and artifacts; repository-backed manifests and checksums.
    Validation/data
    Zod, D1 migrations, shared TypeScript domain types, parameterized repository methods.
    Jobs
    Cloudflare Queues and Cron Triggers for durable/retryable background work; V1 minimizes scheduled jobs.
    Deployment
    Cloudflare Pages/Workers with GitHub-based CI/CD, previews, CDN, TLS, DNS, and custom domain.
    Protection
    Cloudflare Turnstile for public forms and future Ask My Portfolio abuse control.
    Testing
    Vitest, React Testing Library, Playwright, axe-core, D1 constraint and Worker authorization tests.
    Observability
    Cloudflare logs/analytics with privacy-safe events; optional Sentry only if a free plan remains appropriate.
    AI (V2/V3)
    Optional provider adapter or local model. V1 works without AI; no AI call occurs during ordinary public page views.

22.2 Deployment topology
Cloudflare manages DNS for usmanalii.com; the apex is canonical and www permanently redirects to it.
Public Astro pages deploy as static assets to Cloudflare’s global network; only authenticated dashboard/API and genuinely dynamic features invoke Workers.
Preview deployments use isolated variables and a staging D1 database/R2 bucket; production data never appears in previews.
The Worker API binds privately to D1, R2, Queues, and secrets. No database or storage credential enters client JavaScript.
D1 stores canonical structured data; R2 stores approved artifacts and exports with public and protected delivery paths separated.
Queues/Cron workers perform GitHub sync, AI proposals, indexing, link checks, exports, and notifications only when their release enables those features.
Webhooks terminate at verified Worker endpoints, enqueue idempotent events, and return promptly.
D1 Time Travel plus scheduled encrypted SQLite/SQL exports, Markdown exports, and R2 manifests provide provider-independent recovery.
22.3 Environments
Environment
Data policy
Deployment
local
Synthetic fixtures; optional developer-owned sandbox.
Astro dev server + local Wrangler D1/R2 emulation.
preview
Synthetic or scrubbed seed only; no production integrations.
Per-branch Cloudflare preview + staging bindings.
staging
Representative non-sensitive data and test integrations.
Protected staging Worker/domain + staging D1/R2.
production
Canonical owner data; strict secrets and access.
usmanalii.com + production Worker, D1 and R2.

22.4 Official visual experience direction
The product must feel like a cinematic, evidence-driven digital identity rather than a generic portfolio template or uncontrolled effects demo. It uses an obsidian interface, luminous mesh gradients, spatial glass surfaces, responsive 3D objects, asymmetric bento composition, and precise physics-based motion. Visual spectacle must clarify identity, relationships, and hierarchy; it must never obscure evidence, reading, navigation, or professional credibility.
22.4.1 Color and material system
Foundation: obsidian #050509, deep midnight #080D1A, elevated navy #0D1528, and translucent dark glass surfaces.
Primary accents: cyber cyan #22D3EE, electric violet #8B5CF6, hot magenta #EC4899, acid lime #B6F43A, and signal blue #3B82F6.
Semantic use: cyan for evidence/verification; violet for intelligence/identity; magenta for experiments/exploration; lime for delivered work/progress; amber/red for warnings and broken or insufficient evidence.
Mesh gradients use cyan-violet-magenta light fields, slow organic distortion, restrained grain, edge vignette, and pointer-responsive illumination.
Glass surfaces use three deliberate elevation levels. Long-form reading surfaces are substantially more opaque than atmospheric or interactive cards.
Glowing borders and gradient text are selective emphasis tools, not universal decoration. Body text maintains WCAG AA contrast.
22.4.2 Signature 3D Evidence Core
The homepage contains one signature WebGL experience: a luminous Evidence Core connected to the five pillars through orbiting nodes and restrained particle/data motion.
The scene communicates product structure: learning, evidence, projects, identity, and career direction. Nodes link to real sections; the scene is not decorative-only.
Pointer movement gently affects camera/light orientation; scroll may reveal pillar relationships without hijacking ordinary page scrolling.
Use simple geometry and shaders rather than large 3D models, heavy textures, real-time shadows, or multiple competing canvases.
Detect WebGL 2. Provide a visually coherent CSS/static fallback, reduced-resolution mobile mode, and no-motion representation.
22.4.3 Layout, typography, and components
Use Geist, Inter, or Manrope as the primary variable sans family and Geist Mono or IBM Plex Mono for technical metadata/code.
Hero titles use a fluid clamp scale up to approximately 8rem with tight line height and selective gradient phrases. Article typography remains editorial and calm.
Homepage and dashboard use content-priority bento grids with purposeful one/two-column and one/two-row spans. Mobile collapses to a logical single-column order.
Core components: atmospheric panel, interactive glass card, evidence chip, capability card, project card, activity cell/day drawer, timeline node, evidence edge, approval diff, command/search field, mode switcher, and 3D fallback panel.
Recruiter mode reduces animation and maximizes scannability; deep-dive mode exposes architecture and proof; the private editor minimizes atmospheric animation to protect concentration.
22.4.4 Motion language
Orientation motion explains navigation and hierarchy; relationship motion connects evidence to capabilities/claims/projects; feedback motion confirms actions; atmospheric motion provides identity.
Interactive cards may lift 4–8 px and tilt no more than approximately 3–5 degrees with spring-based return, pointer-following highlight, and restrained layered parallax.
Short hero statements may reveal by line or word; long-form prose must never use continuous word-by-word reveal.
Page transitions may morph a selected card into a destination header using native View Transitions when supported, with immediate navigation fallback.
Cursor lighting is desktop enhancement only; touch devices receive stable surfaces. No required information or action depends on hover.
Respect prefers-reduced-motion: remove continuous shader movement, parallax, tilt, word reveals, and morphing transitions while preserving structure and state feedback.
22.4.5 Page-specific visual intent
Surface
Visual intent
Home
Cinematic Evidence Core, massive identity statement, five-pillar navigation, proof-oriented bento grid, featured project, capabilities, current focus, and living heatmap.
Journey
Luminous chronology with calm editorial entries; visual effects recede behind reading and discovery.
Skills / capabilities
Evidence constellation, descriptive maturity rationale, first-to-latest timeline, related projects, and explicit limitations.
Project case study
Cinematic header, architecture visualization, engineering timeline, artifacts, experiments, ADRs, debugging lessons, deployment and evidence-backed outcomes.
Recruiter mode
Fast, minimal, high-contrast scan path with role, proof, selected projects, résumé and contact.
Deep-dive mode
Technical spatial navigation for architecture, source, decisions, experiments, failures and provenance.
Private dashboard
Calmer obsidian/glass workspace; bento overview and precise workflow feedback without full-screen WebGL during authoring.

22.4.6 Visual performance budget
Static-render nearly every public page. Load React islands only where interactivity adds material value.
Load Three.js/React Three Fiber only on pages containing the Evidence Core or an approved technical visualization.
The critical public shell should target less than approximately 150 KB compressed JavaScript, excluding the separately lazy-loaded 3D scene.
Use one homepage WebGL canvas, clamp device pixel ratio, pause when hidden/offscreen, dispose resources on navigation, and avoid expensive post-processing.
Prevent 3D and animation from delaying LCP or blocking primary content. The hero’s text and calls to action render before the 3D scene.
Mobile, battery-saving, low-memory, WebGL-unavailable, reduced-data, and reduced-motion modes receive graceful static alternatives.
22.4.7 Visual acceptance criteria
The site remains complete, navigable, readable, and professional with JavaScript disabled except explicitly dynamic dashboard functions.
No animation causes layout shift, traps scroll, blocks input, or delays navigation.
All interactive motion has keyboard/focus behavior and reduced-motion treatment.
Recruiter mode communicates positioning, strongest proof, projects, résumé and contact within a 90-second scan.
The 3D Evidence Core has a semantic text equivalent and does not expose or invent professional facts.
Representative mobile hardware sustains smooth interaction without thermal-heavy continuous rendering.
No page resembles an unstructured collection of neon effects; every visual element maps to identity, hierarchy, evidence, status, or relationship. 23. V1 explicit scope and acceptance criteria
23.1 V1 in scope
Responsive public home, journey, entry, skills/capabilities, project index/case study, activity, about, résumé placeholder/web profile, recruiter mode, deep-dive mode, search, privacy page.
Owner authentication and private dashboard.
Structured journal authoring for four entry types with preview, revisions, publishing, relationships, SEO, and visibility.
Evidence Ledger with manual records, artifacts metadata, provenance, verification, support links, and dependency-aware archive.
Skill taxonomy, bounded capabilities, descriptive maturity with manual owner approval, and public evidence views.
Projects with timeline, artifacts, experiments, ADRs, debugging lessons, releases/deployments, outcomes, and case-study builder.
Manual GitHub repository/commit/file/PR/release linking; selected public repository metadata refresh and link health.
Activity ledger and public/private heatmap with accessible alternative.
Canonical profile and claim library; evidence validation for public professional claims.
Lexical search; JSON/Markdown/media export; backups; audit logging; analytics and observability.
23.2 V1 explicitly deferred
Continuous GitHub webhooks/full synchronization and AI metadata extraction (V2).
Automatic résumé generation/PDF templates and advanced portfolio propagation (V2; V1 may host a manually approved résumé).
Job parsing/matching, interview preparation, semantic search, Ask My Portfolio, and knowledge graph (V3).
Multi-user architecture, billing, public authoring, open-source distribution, and SaaS controls (V4).
23.3 Release acceptance criteria
ID
Acceptance criterion
AC-01
Owner can create each journal type, link project/skill/evidence, preview exact public output, publish, revise, unpublish, and restore without data loss.
AC-02
A public skill page shows capabilities and qualifying evidence with no percentage proficiency UI or unsupported maturity claim.
AC-03
A project case study supports every required engineering section and timeline type, including artifact, experiment, ADR, and debugging lesson.
AC-04
Every published professional claim passes support validation or a permitted, audited background-statement exception.
AC-05
Private/restricted data is absent from public HTML, APIs, search, sitemap, analytics payloads, heatmap totals, and unauthenticated error behavior.
AC-06
GitHub links store durable provenance fields, can be revalidated, and display stale/broken states without deleting history.
AC-07
Heatmap deduplicates events, applies documented categories/caps, respects timezone/visibility, and has keyboard/screen-reader equivalent.
AC-08
Recruiter mode presents summary, selected capabilities, projects, proof, résumé/contact path; deep-dive mode exposes technical records without duplication.
AC-09
Owner export contains canonical JSON, Markdown content, relationship manifests, audit metadata allowed for owner, and artifacts/checksums.
AC-10
Worker authorization and storage-delivery tests show cross-scope/private leakage is impossible for all public endpoints and object paths.
AC-11
Public templates meet WCAG 2.2 AA automated checks plus manual keyboard/screen-reader smoke tests.
AC-12
Performance targets are met on representative mobile and desktop test runs, including the 3D fallback matrix; publish/search critical paths have monitoring.
AC-13
Backup restore rehearsal reconstructs the application in staging, including relationships and artifact references.
AC-14
No AI-generated data exists in canonical/public fields without an approval audit event; V1 works fully without AI.
AC-15
Domain, TLS, canonical redirect, sitemap, robots, structured metadata, error pages, security headers, and production alerts are verified.
AC-16
The cinematic UI passes the visual acceptance criteria: purposeful Evidence Core, bento hierarchy, responsive glass surfaces, reduced-motion mode, static fallback, and no content-blocking animation.

24. Roadmap
    Release
    Scope
    Exit outcome
    V1 — Foundation
    Canonical data model; public/private site; journal; ledger; skills/capabilities; projects; manual GitHub links; heatmap; profile/claims; recruiter/deep dive; lexical search; privacy/export.
    Trustworthy single source of truth and publishable proof.
    V2 — Intelligence & automation
    GitHub synchronization; AI metadata/evidence suggestions; approval center; capability progression; dependency propagation; résumé engine and exports.
    Reduce maintenance without surrendering factual control.
    V3 — Career Intelligence
    Job requirement mapping; evidence-aware fit; next-evidence planning; interview prep; semantic search; Ask My Portfolio; knowledge/evidence graph; advanced analytics.
    Turn the record into explainable career decision support.
    V4 — Productization
    Configurable identity engine, multi-tenant isolation, onboarding, templates, connector framework, optional open-source/self-host or SaaS, billing/admin if chosen.
    Validate a reusable product without weakening owner data rights.

25. Success metrics
    Area
    Metric / target
    Data trust
    ≥95% of public claims have at least one approved support edge; 0 confirmed AI-fabricated professional facts; 0 private-data leaks.
    Author workflow
    Median time to capture a note/evidence item <3 minutes; ≥80% of started drafts recover/save successfully; approval queue median age <7 days.
    Evidence quality
    Increasing share of capabilities supported by ≥2 evidence types and at least one applied/delivered item; broken public evidence <2%.
    Identity consistency
    All active surfaces derive from canonical records; stale-surface warnings resolved within 14 days.
    Recruiter usefulness
    Featured proof click-through, project case-study completion, résumé/contact actions; qualitative feedback confirms role and proof are understandable.
    Career value (V3)
    Owner accepts or acts on next-evidence recommendations; match explanations are judged accurate and useful in review samples.
    Technical
    Meet performance/availability targets, successful daily backups, quarterly restore test, accessibility release gate, low failed-job age.

Traffic, follower counts, raw commits, streak length, and total skill count are diagnostic at most and are not product success measures. 26. Risks and mitigations
Risk
Failure mode
Mitigation
Scope explosion
Five pillars create a large surface.
Freeze V1, use vertical slices, defer sync/AI/career intelligence, require change-control decisions.
Incorrect data model
Evidence, skills, artifacts, claims, and content become tangled.
Implement explicit entities/edges, constraints, migrations, fixtures, and schema review before UI breadth.
AI fabrication
Polished but false career facts damage trust.
Proposal-only architecture, citations, risk tiers, approval audit, evaluations, no autonomous publication.
Privacy leakage
Private repository/work/job data reaches public views or AI.
Central Worker authorization, publishable projections, red-team tests, data minimization, aggregate isolation, and protected R2 delivery.
Visual excess
3D, glow and motion overwhelm content or mobile devices.
One signature canvas, visual budgets, purposeful semantics, reduced-motion/static fallbacks, device testing, and recruiter-mode restraint.
Maintenance burden
Owner stops documenting because workflows are heavy.
Quick capture, templates, inbox, sensible defaults, batch low-risk metadata review, measure capture time.
Gaming/vanity metrics
Heatmap or maturity becomes misleading.
Documented activity label, caps/dedupe, no streaks, descriptive maturity, evidence diversity and limitations.
GitHub fragility
Rate limits, deleted repos, changed links.
Webhooks + reconciliation in V2, caching, durable refs, health checks, historical snapshots/alternate artifacts.
SEO duplication
Modes/filters create duplicate pages.
Canonical URLs, noindex filtered/unlisted views, controlled redirects.
Vendor lock-in
Core record tied to platform/provider.
Portable SQLite/SQL and Markdown exports, provider adapters, owner-controlled artifacts, tested restore.
Public overexposure
Learning journey reveals too much or weak early work.
Private by default, per-field visibility, curated featured surfaces, preview and embargo.
False job-fit precision
Score looks authoritative.
State-based matches, explainable weights, evidence citations, uncertainty, owner-editable requirement interpretation.

27. Testing and quality strategy
    27.1 Test layers
    Unit: maturity rules, heatmap aggregation/dedupe, visibility resolution, claim support validation, slug logic, job-match states, export transforms.
    Database: D1 migrations, constraints, public projection queries, concurrent writes, soft-delete dependencies, and query-plan/index tests.
    Contract: GitHub fixtures, webhook signatures/idempotency, provider rate limits, AI structured-output schemas, R2 policies.
    Integration: author→approve→publish; evidence invalidation→support warning; visibility change→index/heatmap purge; export/restore.
    End-to-end: recruiter scan, deep dive, search, owner capture/edit/preview/publish, approval, broken-link repair, disconnect integration.
    Accessibility: axe automation plus keyboard, focus order, zoom/reflow, screen reader smoke tests, non-color heatmap interpretation, PDF checks, and reduced-motion validation.
    Security: threat model, dependency scanning, secret scanning, XSS/MDX sanitization, IDOR/Worker authorization tests, Access-token validation, CSRF, rate limits, R2 delivery, and prompt-injection tests in V3.
    Visual/performance: WebGL fallback matrix, mobile GPU/thermal behavior, JavaScript budgets, animation frame stability, content-first LCP, cache invalidation, publish bursts, and queue backlogs.
    AI evaluation (V2+): groundedness, citation correctness, fact preservation, privacy leakage, hallucination, confidence calibration, rejection behavior.
    Recovery: D1 Time Travel procedure, encrypted SQLite/SQL export integrity, artifact manifest validation, and full staging restore rehearsal.
    27.2 Definition of done
    Requirement and acceptance criterion linked to tests.
    Authorization and privacy review completed for new data paths.
    Observability and actionable errors included.
    Accessibility checked for changed UI.
    Migration forward and rollback/repair path documented.
    Documentation and export schema updated.
    No unsupported professional claim introduced in fixtures, demos, or production.
28. Migration, backup, export, and ownership
    28.1 Initial content migration
    Inventory existing portfolio pages, résumé, GitHub repositories, notes, blog drafts, project assets, education/experience records.
    Map each source into canonical entity types; preserve original files and source metadata.
    Import privately into staging; generate duplicate/conflict report.
    Owner validates profile facts, project ownership, dates, visibility, and evidence links.
    Publish selected records incrementally; redirects preserve old URLs.
    Record migration batch, source, transform version, and reconciliation counts.
    28.2 Backups
    Use D1 Time Travel for short-window recovery and schedule provider-independent encrypted SQLite/SQL exports; document RPO/RTO before launch.
    Export the R2 object manifest and checksums; replicate critical owner-controlled artifacts to a separate provider or encrypted local archive.
    Daily backup monitoring, monthly integrity checks, and quarterly staging restore rehearsal.
    Secrets are recovered through Cloudflare secret configuration and an approved offline recovery process, never inside content exports.
    28.3 Owner export
    Owner can request a full or scoped export. Package includes versioned JSON for entities/relationships; Markdown/MDX for content; CSV summaries; original approved artifacts where licensing/privacy allows; media manifest with checksums; redirects/slugs; provenance and visibility metadata; and a README/schema version. Exports are encrypted or protected, expire from download storage, and are audited. Deletion is a separate explicit flow with dependency preview and retention disclosure.
29. Future extensibility and productization
    Use provider-neutral source and external identity fields; GitHub is the first adapter, not a schema special case.
    Keep policy/visibility, evidence support, and approval services tenant-aware even while V1 has one owner; enforce single-owner configuration initially.
    Store content blocks with schema versions and migration functions; preserve Markdown export.
    Keep maturity and matching rules versioned and replaceable; derived assessments retain rule version.
    Use an integration registry for future certificates, university records, deployments, open source, professional work, Google Drive, LinkedIn export, or learning platforms.
    V4 decision gate requires evidence of demand, a tenant isolation threat model, onboarding/support plan, export/deletion SLAs, and a choice among personal open source, hosted single-user, or multi-user SaaS.
    Productization must preserve the non-negotiables: evidence-first claims, human approval, privacy by default, descriptive capability, and data portability.
30. Prioritized implementation plan
    Priority
    Deliverable
    Exit gate
    P0. Architecture baseline
    Confirm glossary, threat model, V1 routes, D1 schema/ERD, public projection strategy, content block format, Worker authorization patterns, ADRs, and seeded fixtures.
    Schema review approved; migrations and policy tests run in CI.
    P1. Platform skeleton
    Astro app, React-island boundary, design tokens, navigation/modes, Cloudflare environments, Access auth, observability, CI/CD, and security headers.
    Authenticated shell and public shell deployed to staging.
    P2. Canonical content + publishing
    Content items/revisions, editor templates, relationships, preview, state machine, visibility, SEO, public journey pages.
    Journal vertical slice passes AC-01 and privacy checks.
    P3. Evidence and artifacts
    Ledger, provenance, verification, artifacts, evidence links, dependency/health UI, export schema.
    Evidence can support and invalidate bounded records audibly.
    P4. Skills/capabilities/claims
    Taxonomy, capability rules, maturity approval, claim library/support validation, public skill pages.
    No unsupported claim or percentage skill representation.
    P5. Projects
    Case-study builder, project chronology, experiments, ADRs, lessons, deployment/release, public indexes/detail.
    Representative project demonstrates complete engineering record.
    P6. Activity + search
    Normalized activities, aggregation/dedupe, heatmap/list, lexical search, public/private indexing and purge.
    Visibility and accessibility criteria pass.
    P7. Identity surfaces
    Home, about, recruiter/deep-dive projections, manually approved résumé view, contact flow.
    Recruiter usability test and evidence traceability pass.
    P8. Integrations + operations
    Manual GitHub linkage/metadata health, import workflow, backup/export, analytics, alerts, admin health.
    Production readiness and restore rehearsal complete.
    P9. Launch hardening
    Content migration, performance/accessibility/security audits, error/empty states, domain/TLS/redirects, runbooks.
    All V1 acceptance criteria signed off.
    V2 onward
    Sync, AI proposals, résumé automation, career intelligence, semantic retrieval, productization.
    Each begins only after separate requirements/evaluation gate.

31. Open decisions and governance
    ID
    Decision
    Due
    D-01
    Editor representation: block JSON with Markdown export vs canonical MDX.
    Before P2
    D-02
    Public claim exception policy for owner-authored background statements.
    Before P4
    D-03
    Activity weights/caps and owner timezone.
    Before P6
    D-04
    GitHub App vs OAuth scope for V2, including private repository policy.
    V2 discovery
    D-05
    AI provider/data retention and private-context opt-in.
    Before any AI production use
    D-06
    Resume PDF rendering service/template strategy.
    V2 discovery
    D-07
    Backup plan/RPO/RTO and secondary artifact archive.
    Before production launch
    D-08
    Contact form/email exposure and spam protection.
    Before P7
    D-09
    Analytics vendor and retention policy.
    Before P8
    D-10
    V4 distribution model: open source, hosted single-user, SaaS, or hybrid.
    After V3 evidence of demand

Product changes that add a new pillar, weaken approval/provenance, introduce automatic publication, or alter public/private semantics require a written ADR and PRD revision. Smaller feature decisions are tracked in the product backlog and must retain requirement traceability.
Appendix A — V1 requirement traceability checklist
□ Public IA and route behavior
□ Private dashboard and authoring
□ Evidence provenance and support semantics
□ Claims vs evidence; skills vs capabilities
□ Projects, artifacts, experiments, ADRs, debugging lessons
□ GitHub manual linking and health
□ Activity rules and accessibility
□ Recruiter/deep-dive modes
□ Worker authorization/privacy/public projections
□ Cinematic design system and 3D fallback matrix
□ Search/index purge
□ Export/backup/restore
□ SEO/accessibility/performance/security
□ Analytics without private-content capture
□ Error/empty/offline states
□ Acceptance tests and launch runbooks
Appendix B — Example evidence-backed chain
Journal entry “Understanding Linear Transformations” → artifact “composition.py at commit abc123” → evidence item “owner-authored implementation and explanation” → skills “Python, NumPy, Linear Algebra” → capability “implements and explains composition of 2D linear transformations” → maturity suggestion “Practiced” → owner approval → claim candidate “Implemented and documented matrix transformation composition in NumPy” → optional project/resume placement. At no point does a raw technology mention become a capability or a public claim automatically.
