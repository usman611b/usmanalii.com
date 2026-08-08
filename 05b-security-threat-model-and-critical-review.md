# usmanalii.com — Security Threat Model & Critical Architecture Review

**Document:** 5B — Pre-implementation security gate  
**Version:** 1.0  
**Scope:** V1 with forward analysis for V2–V4  
**Security baseline:** OWASP ASVS-aligned, single-owner high-integrity application

## 1. Security objective

Protect private professional history, artifacts, job data, credentials and canonical identity while ensuring public pages reveal only explicitly approved information. A security failure can cause both privacy harm and professional reputational harm; therefore authorization, evidence integrity and publication safety are release-blocking concerns.

## 2. Assets requiring protection

- Owner identity and authenticated session
- Private journal entries and drafts
- Evidence provenance and private source locators
- Private repositories and GitHub tokens
- Employment, education and career-planning data
- Claims, approvals and professional surfaces
- Original artifacts and exports in R2
- D1 canonical records and backups
- Cloudflare/GitHub/API credentials
- Audit history and integrity metadata
- Future job descriptions, embeddings and AI context
- Availability and integrity of the public professional identity

## 3. Trust boundaries

1. Public visitor ↔ Cloudflare edge/static site
2. Owner browser ↔ Cloudflare Access
3. Access ↔ Worker API
4. Worker ↔ D1/R2/Queues/secrets bindings
5. GitHub ↔ webhook endpoint
6. Queue producer ↔ queue consumer
7. Application ↔ future AI provider
8. Production ↔ backup archive
9. Build pipeline ↔ production deployment

No trust crosses a boundary implicitly. Every transition has authentication, validation, authorization, integrity and logging requirements.

## 4. Threat actors

- Unauthenticated internet attacker
- Automated bot or scraper
- Attacker with a leaked URL or artifact link
- Attacker with stolen owner email/session/device
- Malicious content embedded in imported Markdown, repository text or job descriptions
- Compromised dependency, build action or developer token
- Abused GitHub webhook or replayed queue event
- Misconfigured administrator/owner
- Curious future tenant attempting cross-tenant access
- AI model or retrieved content producing malicious instructions

## 5. Critical findings before coding

### CRITICAL-01 — Cloudflare Access alone is insufficient inside the Worker

The Worker must validate the `Cf-Access-Jwt-Assertion` signature, issuer, audience, expiry and configured owner identity. Header presence alone is not authentication. Cloudflare recommends validating this header rather than relying on the cookie. [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

**Required control:** Fail closed when validation keys cannot be obtained or claims do not match. Cache signing keys with rotation support. Re-authenticate critical export, integration and deletion actions.

### CRITICAL-02 — D1 has no database-native row-level security

All privacy depends on Worker authorization and repository correctness.

**Required control:** Every canonical repository method requires an authorization context. Public repositories expose dedicated publishable queries. Add negative IDOR tests for every entity and action. Never accept `owner_id` from the browser.

### CRITICAL-03 — R2 exposure can bypass database visibility

Public buckets, predictable object keys or long-lived signed URLs could expose private artifacts.

**Required control:** Private originals remain non-public; use randomized keys and Worker-mediated delivery or very short-lived, operation-specific URLs. Treat presigned URLs as bearer tokens. Restrict content type and CORS. [R2 presigned URL guidance](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

### CRITICAL-04 — Publication can leak private dependencies

A public claim/content item may reference private evidence, artifact metadata, filenames, counts or graph edges.

**Required control:** Central effective-visibility resolver; publication preflight; public response DTO allowlists; privacy tests across HTML, JSON, search, sitemap, heatmap, analytics, errors and caches.

### CRITICAL-05 — Content is untrusted executable-adjacent input

MDX, code blocks, SVG, HTML, embeds and imported repository content can introduce XSS or unsafe requests.

**Required control:** Do not execute arbitrary MDX components. Use a strict component allowlist, sanitize HTML/SVG, block scripts/event handlers, isolate previews, and apply CSP. Uploaded HTML is downloaded, never rendered inline.

## 6. High-risk threat register

| Threat | Risk | Required mitigation |
|---|---|---|
| IDOR on entity APIs | Critical | Owner-context repositories, negative tests, opaque errors |
| Stolen Access session | Critical | MFA, short sessions, device hygiene, critical-action re-authentication, session revocation |
| Private R2 object leak | Critical | Private buckets/prefixes, randomized keys, authorized delivery, short expiry |
| XSS through content | Critical | Sanitization, component allowlist, CSP, safe preview isolation |
| Secret leakage | Critical | Worker secrets/bindings, redacted logs, scanning, rotation; never client variables |
| Malicious deployment | Critical | Protected branch, reviewed CI, pinned actions, least-privilege deploy token |
| Webhook forgery/replay | High | Signature verification on raw body, event-ID idempotency, timestamp/replay policy |
| Queue replay/poison message | High | Versioned envelope, idempotency, attempt limits, dead letter, authorization context reconstruction |
| CSRF on owner mutation | High | Origin validation, SameSite cookies, CSRF token where applicable, non-GET mutations |
| SSRF through URL capture | High | URL parser, protocol allowlist, DNS/IP checks, redirect limits, response limits, blocked private ranges |
| Upload malware/polyglot | High | Type allowlist, magic-byte verification, size limits, quarantine, no execution, safe derivatives |
| Cache privacy mix-up | High | Never cache private responses publicly; explicit Cache-Control/Vary; separate public DTOs |
| Backup compromise | High | Client-side/off-provider encryption, restricted keys, restore audit, retention policy |
| Audit tampering | High | Append-oriented events, restricted writes, export/checksum, no UI hard-delete |
| AI prompt injection (V2+) | High | Retrieved text is data, separated instructions, no autonomous tools, citations, output validation |
| Cross-tenant access (V4) | Critical | Separate V4 threat model and isolation proof before productization |

## 7. Authentication and session controls

- Permit only the configured owner identity in V1.
- Require MFA on the identity provider.
- Validate Access JWT cryptographically on every private API request.
- Check exact audience and issuer; do not accept tokens for another Access application.
- Use short administrative session duration.
- Never place access tokens in URLs, localStorage or analytics.
- Critical actions require recent authentication: integration credentials, private export, visibility escalation and deletion.
- Provide a documented session-revocation and lost-device procedure.

## 8. Authorization model

Authorization order:

1. Authenticate token.
2. Establish immutable owner context.
3. Validate requested action.
4. Load entity through owner-scoped query.
5. Resolve parent/evidence/artifact visibility.
6. Apply field allowlist/DTO.
7. Audit sensitive mutation.

Never load by unrestricted ID and “check later.” Batch endpoints verify every entity. Background jobs reload authorization-relevant state and cannot trust owner IDs from message payloads alone.

## 9. Input and content security

- Zod validation at every request boundary.
- Parameterized D1 statements only.
- Maximum lengths, collection sizes and nesting depths.
- Normalize Unicode and reject control-character abuse where relevant.
- URL allowlist: HTTPS by default; block credentials in URLs and private/link-local IP targets.
- Markdown renderer disallows raw HTML by default.
- SVG is sanitized or rasterized; no active SVG from untrusted sources.
- Code snippets are text, never executed server-side or in the reader’s browser.
- External embeds use explicit allowlist, sandbox and privacy review.

## 10. File-upload security

1. Authenticate before upload authorization.
2. Generate server-controlled random key.
3. Restrict operation, content type, size and short expiry.
4. Upload into quarantine/private prefix.
5. Verify magic bytes, checksum and declared type.
6. Strip unsafe metadata and create safe image derivatives.
7. Never execute or inline unknown files.
8. Approve association and visibility separately.
9. Log download/export security events without logging signed URLs.

Cloudflare bindings embed access capability without exposing underlying credentials, but a binding is still powerful and should be available only to the Worker that needs it. [Cloudflare Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)

## 11. GitHub integration security

### V1 manual links

- Validate scheme and github.com host when classified as GitHub evidence.
- Do not fetch arbitrary repository URLs server-side without SSRF controls.
- Treat repository descriptions, README and code as untrusted content.

### V2 GitHub App

- Least-privilege permissions and selected repositories only.
- Encrypt token material in secrets; never store token plaintext in D1.
- Verify webhook signature before parsing business content.
- Idempotency by delivery/event ID.
- Reconcile permissions and uninstall events.
- Private repository data remains excluded from public projection and AI by default.

## 12. AI and semantic-search security

- AI is disabled in V1.
- Private AI use requires explicit data-retention/provider review.
- Retrieved records are untrusted data, not instructions.
- Model has no direct canonical mutation, publication, integration or deletion tool.
- Outputs use strict schemas and citations.
- Approval UI displays sources, diff, privacy and impacted surfaces.
- Public Ask My Portfolio retrieves public approved chunks only.
- Apply prompt-injection, data-exfiltration and cross-scope evaluation suites.
- Store minimal query logs with owner-configurable retention.

## 13. Secrets and infrastructure

- Use Cloudflare secrets/Secrets Store, not plaintext environment files in Git.
- Separate secrets and bindings per environment.
- Production deploy token is least privilege and not available to preview builds.
- Rotate after suspected disclosure and on documented schedule.
- Instantiate secret-dependent clients per request when rotation freshness matters; Cloudflare warns that global derived clients can retain old binding values. [Cloudflare secret/binding guidance](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- Disable unused bindings, routes and preview access.

## 14. Supply-chain and CI/CD security

- Protected main branch and reviewed pull requests.
- Lockfile committed; dependency updates reviewed.
- Pin GitHub Actions to immutable commit SHAs where feasible.
- Minimal CI permissions; no production secrets for fork/preview builds.
- Secret and dependency scanning.
- Build provenance and release commit recorded.
- Preview deployments use synthetic data and staging bindings.
- Emergency rollback to last-known-good deployment.

## 15. Logging, analytics and privacy

Logs may include request ID, safe entity ID/type, action, timing and error code. Logs must not include evidence bodies, drafts, job descriptions, tokens, signed URLs, private filenames, AI prompts or full request payloads. Analytics is absent from the private dashboard unless specifically designed with privacy-safe events.

## 16. Availability and abuse

- Static public pages remain available during D1/API failure.
- Rate-limit contact, search, upload authorization, export and future Ask endpoints.
- Turnstile protects public write endpoints.
- Set request/body/time limits.
- Queue workloads are bounded and idempotent.
- Alerts cover authorization anomalies, repeated failures, queue backlog and free-tier exhaustion.

## 17. Backup security

- Encrypt portable database exports before off-provider storage.
- Keep encryption keys separate from backups.
- Export links are authenticated, short-lived and single-purpose.
- Backup manifests contain checksums but avoid unnecessary secret metadata.
- Test restore quarterly.
- Define retention and secure deletion.
- Treat backups as equally sensitive as production.

## 18. Security testing plan

### Automated

- Authentication/JWT validation tests
- IDOR tests for every entity and mutation
- Visibility/public-projection matrix
- SQL injection and validation tests
- XSS/Markdown/SVG payload corpus
- SSRF URL corpus
- Upload type/polyglot/size tests
- CSRF/origin tests
- Webhook signature/replay tests
- Queue idempotency/poison-message tests
- Cache-header privacy tests
- Secret scanning and dependency audit
- Security-header/CSP tests

### Manual release tests

- Different-identity Access attempt
- Lost/revoked session behavior
- Private record search/cache/sitemap leakage audit
- R2 object guessing and expired URL test
- Publish-with-private-dependency attack
- Browser accessibility/security interaction review
- Backup download and restore authorization
- Incident tabletop exercise

## 19. Release-blocking security gates

Coding may start after threat-model approval, but production release is blocked unless:

1. Access JWT verification passes positive and negative tests.
2. Every private repository method has IDOR tests.
3. Public projection leakage matrix passes.
4. R2 originals are not publicly enumerable/readable.
5. Content sanitization and CSP tests pass.
6. SSRF and upload protections pass.
7. Secrets are absent from code, bundles, logs and preview environments.
8. Backup is encrypted and restore-tested.
9. Security alerts and incident runbooks exist.
10. No critical/high finding remains without explicit remediation and retest.

## 20. Incident response

Severity levels cover public defacement, private-data exposure, account/session compromise, secret exposure, malicious deployment and evidence-integrity corruption.

Immediate sequence:

1. Contain: disable feature/route, revoke sessions/tokens and freeze publication.
2. Preserve: logs, deployment IDs, audit events and backup state.
3. Assess: affected records, visibility and exposure window.
4. Recover: last-known-good deployment and verified backup/repair.
5. Notify as legally/ethically appropriate.
6. Rotate credentials and patch root cause.
7. Document post-incident actions and tests.

## 21. V2–V4 security gates

- **V2:** GitHub App permissions, webhook threat model, AI data-processing review and résumé factual-integrity tests.
- **V3:** Prompt-injection/red-team suite, embedding authorization, public Q&A abuse controls and private job-data retention.
- **V4:** New dedicated multi-tenant threat model, isolation proof, customer authentication, support access, billing abuse, per-tenant backup/export/deletion and independent penetration test.

## 24. R2/D1 Consistency & Safe Artifact Delivery Model (M3 Verification Baseline)

### A. R2/D1 Failure Consistency & Orphan Cleanup
1. **Server-Only Unpredictable Keys**: Binary storage keys generated exclusively on server (`artifacts/${ownerId}/${uuid}.${ext}`). User paths stripped via `sanitizeFilename`.
2. **Atomic Rollback & Failure Isolation**:
   - If R2 `put()` fails -> request aborts with 500 error; no D1 metadata created.
   - If R2 succeeds but D1 `create()` fails -> immediate `r2.delete(r2Key)` issued to prevent orphaned R2 objects.
   - If R2 deletion fails during hard delete -> failure logged for reconciliation sweep without breaking D1 integrity.
3. **Reconciliation Sweeps**: Endpoint `/api/v1/private/artifacts/reconcile` sweeps orphaned objects and missing D1 bindings without public storage key exposure.

### B. Safe Artifact Delivery Headers
- **Content-Type**: Allowlisted media type (`text/html` forced to `text/plain`).
- **Content-Security-Policy**: Restrictive `default-src 'none'`.
- **X-Content-Type-Options**: `nosniff`.
- **Content-Disposition**: `attachment; filename="..."` with CRLF/header injection sanitization (`replace(/[\r\n\0]/g, '')`).
- **Cache-Control**: `private, no-store, must-revalidate` (private) / `public, max-age=3600, s-maxage=86400` (public eligible).
