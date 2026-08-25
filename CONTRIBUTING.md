# Contributing

This repository favors small, evidence-backed changes that preserve the canonical-data and
publication-safety model.

## Development workflow

1. Create a focused branch from `main`.
2. Install with the pinned toolchain: `corepack pnpm install --frozen-lockfile`.
3. Copy `.dev.vars.example` to `apps/worker/.dev.vars` and use local-only values.
4. Make the smallest coherent change and add or update tests.
5. Run the complete release gate before opening a pull request.

```bash
pnpm lint
pnpm typecheck
pnpm test:sequential
pnpm migrations:check
pnpm security:scan
pnpm format:check:all
pnpm build
```

## Pull requests

- Explain the problem, the behavior change, and the verification performed.
- Link relevant requirements, ADRs, evidence, or screenshots.
- Describe schema, API, authorization, publication, and accessibility impact.
- Never include production secrets or real private visitor/owner records.
- Keep generated output, local databases, logs, and `.env*` files out of commits.

## Database migrations

- Migrations are append-only and ordered.
- Never edit an applied migration.
- Add the migration to the checksum manifest and verify `pnpm migrations:check`.
- Include upgrade, compatibility, and rollback implications in the pull request.

## Architecture decisions

Changes to trust boundaries, canonical ownership, public projections, evidence semantics, or platform
architecture require an ADR in `docs/adrs/`.

## Commit style

Use concise conventional commits such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`,
or `security:`. Each commit should remain reviewable and independently understandable.
