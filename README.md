# usmanalii.com — Personal Career OS

**Status:** Production — live career OS and owner-managed Command Center
**Architecture:** Astro on Cloudflare Pages + Cloudflare Workers, D1 and R2

## Repository structure

```
apps/
  web/          Astro public site + dashboard shell
  worker/       Cloudflare Worker API (Hono, typed routing)
packages/
  domain/       Pure domain entities and business rules
  database/     D1 repositories, migrations, fixtures
  contracts/    Zod schemas and API DTOs
  authorization/ Identity, ownership and visibility policy
  content/      Markdown/MDX import/export rules
  design-system/ Tokens and UI components
  evidence/     Provenance and support-edge logic
  search/       Public index + authenticated search
  observability/ Structured logging, metrics, error taxonomy
  test-fixtures/ Synthetic-only fixtures (no real personal data)
infrastructure/
  wrangler/     Environment bindings and configuration
  scripts/      Migration verification and security checks
docs/
  adrs/         Architecture Decision Records (ADR-001 through ADR-010)
  traceability.md Requirements traceability map
```

## Quick start

```bash
# Install dependencies
pnpm install

# Run the deterministic workspace test suite
pnpm test:sequential

# Run type checking
pnpm typecheck

# Verify all migration checksums and ordering
pnpm migrations:check

# Local development (requires .dev.vars — copy from .dev.vars.example)
cd apps/worker && pnpm dev
```

## Security

- See `docs/adrs/ADR-003-cloudflare-access-owner-identity.md` for access configuration
- **NEVER** commit `.dev.vars` or real secrets
- All environment secrets are stored in Cloudflare Secrets Store

## Documentation

- [Current production release status](docs/PRODUCTION_RELEASE_STATUS.md)
- [Technical Architecture](04-technical-architecture.md)
- [Database and Evidence Model](02-database-and-evidence-model.md)
- [UI/UX Visual Design Specification](03-ui-ux-visual-design-specification.md)
- [Security Threat Model](05b-security-threat-model-and-critical-review.md)
- [ADR Index](docs/adrs/)
