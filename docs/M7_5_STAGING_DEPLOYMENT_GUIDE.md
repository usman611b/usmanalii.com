# Milestone M7.5 — Cloudflare Staging Deployment Guide

This runbook deploys the application to `staging.usmanalii.com` without changing the live
`usmanalii.com` website or production resources. Run every command from the repository root.

## 1. Safety boundary

- Staging D1 database: `usmanalii-staging`
- Staging private R2 bucket: `usmanalii-artifacts-staging`
- Pages project: `usmanalii-web-staging`
- Worker route: `staging.usmanalii.com/api/*`
- Staging GitHub synchronization: manual only (no cron trigger)
- Production GitHub synchronization: once daily at `00:00 UTC`
- Never deploy `LOCAL_OWNER_TOKEN` outside localhost.
- Never use a staging resource in the production environment.

The three R2 binding names (`ARTIFACTS_BUCKET`, `R2_PRIVATE`, and `R2_PUBLIC`) intentionally point
to the same private staging bucket. `ARTIFACTS_BUCKET` is canonical; the other two are temporary
compatibility aliases. All object delivery remains Worker-mediated under ADR-006. Do not enable an
R2 public development URL or custom public bucket domain.

## 2. Validate committed configuration

```text
pnpm cloudflare:config:check
pnpm migrations:check
pnpm migrations:staging:plan
pnpm migrations:staging:remote-plan
```

The local plan verifies all 19 immutable source checksums and generates the approved ADR-011
compatibility transformations in memory. The remote plan reads `schema_versions` from staging and
lists only unapplied checksum-approved files. Neither command makes remote changes.

## 3. Create the ignored staging configuration

Copy:

```text
infrastructure/wrangler/wrangler.staging.toml.example
```

to:

```text
infrastructure/wrangler/wrangler.staging.toml
```

Find the D1 ID locally:

```text
pnpm --dir apps/worker exec wrangler d1 list
```

Replace only `STAGING_DB_ID_HERE` in the ignored file with the ID for `usmanalii-staging`. Confirm
Git ignores the file:

```text
git check-ignore infrastructure/wrangler/wrangler.staging.toml
```

Do not put secrets in this file.

## 4. Authenticate and dry-run the exact Worker configuration

```text
pnpm --dir apps/worker exec wrangler login
pnpm --dir apps/worker exec wrangler whoami
pnpm --dir apps/worker exec wrangler deploy --dry-run --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml --outdir=dist-staging
```

Review the dry-run bindings. They must contain only `usmanalii-staging` and
`usmanalii-artifacts-staging`. The route must be `staging.usmanalii.com/api/*`.

## 5. Deploy the Pages frontend to staging

```text
pnpm --filter @usmanalii/web build
pnpm --dir apps/worker exec wrangler pages deploy ../../apps/web/dist --project-name=usmanalii-web-staging --branch=staging
```

In Cloudflare, open **Workers & Pages → usmanalii-web-staging → Custom domains** and add
`staging.usmanalii.com`. Do not change the apex or `www` records.

## 6. Deploy the fail-closed Worker API

```text
pnpm --dir apps/worker exec wrangler deploy --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
```

This attaches only `staging.usmanalii.com/api/*`. Pages continues serving every non-API path.
Private API requests remain unauthorized until Access and the required secrets are configured.

## 7. Create one Cloudflare Access application

In **Zero Trust → Access controls → Applications**, create one self-hosted application named
`usmanalii-staging-owner`. Add these public hostnames to that same application:

- `staging.usmanalii.com/dashboard`
- `staging.usmanalii.com/dashboard/*`
- `staging.usmanalii.com/api/v1/private`
- `staging.usmanalii.com/api/v1/private/*`

Create one Allow policy named `Owner only`:

- Include selector: `Emails`
- Value: the exact owner email
- Login method: the default Cloudflare identity provider

Do not use `Everyone`, `Emails ending in`, or a permanent Bypass policy. Copy the single
Application Audience (AUD) tag after saving the application.

## 8. Set encrypted Worker secrets

Run each command with the ignored staging configuration:

```text
pnpm --dir apps/worker exec wrangler secret put OWNER_EMAIL --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put CF_ACCESS_TEAM_DOMAIN --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put CF_ACCESS_AUD_TAG --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put GITHUB_TOKEN --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put PREVIEW_SECRET --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put RESEND_API_KEY --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put CONTACT_FROM_EMAIL --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
pnpm --dir apps/worker exec wrangler secret put TURNSTILE_SECRET_KEY --env staging --config=../../infrastructure/wrangler/wrangler.staging.toml
```

Values:

| Secret                  | Required value                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `OWNER_EMAIL`           | Exact email allowed by the Access policy                                           |
| `CF_ACCESS_TEAM_DOMAIN` | `https://falling-field-38c5.cloudflareaccess.com`                                  |
| `CF_ACCESS_AUD_TAG`     | AUD tag from `usmanalii-staging-owner`                                             |
| `GITHUB_TOKEN`          | Fine-grained, read-only token limited to approved repositories                     |
| `PREVIEW_SECRET`        | A unique random 32-byte-or-longer staging secret                                   |
| `RESEND_API_KEY`        | Resend key restricted to the verified sending domain                               |
| `CONTACT_FROM_EMAIL`    | Sender identity verified in Resend; recipient comes from the private profile email |
| `TURNSTILE_SECRET_KEY`  | Secret key for the staging contact-form Turnstile widget                           |

Use a different `PREVIEW_SECRET` in production. Never configure `LOCAL_OWNER_TOKEN` in Cloudflare.

In **Workers & Pages → usmanalii-web-staging → Settings → Variables and Secrets**, set the Pages
build variable `PUBLIC_TURNSTILE_SITE_KEY` to the matching public staging site key. The Turnstile
widget hostname allowlist must contain `staging.usmanalii.com`. The public site key is safe to
expose in the frontend; the secret key must exist only in Worker secrets.

## 9. Apply checksum-approved migrations

First repeat the non-mutating plan:

```text
pnpm migrations:staging:plan
```

Then run the staging-only executor with the ignored configuration and explicit confirmation:

```text
node infrastructure/scripts/apply-remote-staging-migrations.mjs --apply --confirm=usmanalii-staging --config=infrastructure/wrangler/wrangler.staging.toml
```

The executor:

1. verifies every immutable migration against `manifest.json`;
2. applies only checksum-approved ADR-011 compatibility SQL;
3. reads `schema_versions` and skips applied versions;
4. rejects production resources and configuration;
5. deletes generated temporary SQL after execution.

Do not use `wrangler d1 migrations apply` for this repository because it would execute historical
files without the checksum-gated ADR-011 compatibility transformations.

## 10. Smoke tests

Verify:

- `https://staging.usmanalii.com/` loads from Pages without Access.
- `https://staging.usmanalii.com/api/v1/public/health` returns `200`.
- `/dashboard` redirects to Access when signed out.
- A non-owner identity is denied.
- The owner can enter the dashboard.
- Private API requests without a valid Access assertion fail closed.
- `POST /api/v1/local-auth/session` returns `404` in staging.
- Journal, projects, skills, evidence, résumé, graph, GitHub sync and activity endpoints use D1 data.
- Artifact upload/download uses the private R2 bucket and respects visibility.
- GitHub synchronization runs only when started manually.
- The contact form renders Turnstile, rejects missing/invalid tokens, and delivers one verified
  test message through Resend without exposing the private recipient address.

Record the deployment IDs, smoke-test evidence and rollback target in the M7.5 closure report.
