# ADR-012: M5 Project Revision Storage

**Status:** Decided

**Date:** 2026-08-09
**Depends on:** ADR-005

## Decision

ADR-005 remains authoritative. Project revisions use canonical structured JSON blocks with schema version `v1`; the D1 integer representation of `v1` is `1`.

`project_revisions` stores:

| Purpose                   | Column                | Contract                                    |
| ------------------------- | --------------------- | ------------------------------------------- |
| Canonical JSON block body | `canonical_body_json` | Authoritative JSON array; never Markdown    |
| Body format               | `body_format`         | `json_blocks`                               |
| Schema version            | `body_schema_version` | Integer `1`, representing ADR-005 `v1`      |
| Generated Markdown export | `markdown_export`     | Derived cache only; never read as authority |

Migration 015 backfills valid JSON arrays from the historical `case_study_snapshot` column. New repository writes serialize validated blocks into `canonical_body_json`, copy that JSON into the compatibility snapshot, and derive `markdown_export`. Update and delete triggers make historical revision rows immutable. Rollback copies canonical JSON into a newly appended revision.

## Sensitive originals

The application does not store unredacted originals. No repository input or domain entity exposes `sensitive_original_text`; public projection, search, export, logs, fixtures, errors, metadata, and audit paths therefore cannot receive it through supported code.

Because application of migration 014 to persistent databases cannot be ruled out, migration 015 retains the physical compatibility column but irreversibly clears every non-null legacy value. It records only the project identifier, cleanup timestamp, and fixed cleanup reason—never the secret value. Database triggers then reject every future insert or update that supplies a non-null value. Removing the empty physical compatibility column requires a separately reviewed schema migration.

## Security boundary

Project URLs are displayed links only. The server does not fetch or follow them. The URL control is therefore public-link validation, not network SSRF prevention. Any future fetcher must validate DNS resolution and every redirect destination at fetch time.
