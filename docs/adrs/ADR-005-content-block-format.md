# ADR-005: Content Block Canonical Format and Markdown Export

**Status:** Decided  
**Date:** 2026-08-08  
**Deciders:** Product Owner & Engineering  
**Depends on:** Database Model §4, Security Threat Model CRITICAL-05

---

## Context

Journal entries, deep dives, and retrospectives require a structured content representation that supports rich editing, evidence link attachments, migration safety, and lifetime portability without exposing the application to MDX script-execution vulnerabilities.

## Decision

**Canonical structured JSON blocks with schema versions, plus automatic Markdown export.**

1. **Canonical Private Store:** Content items store body content as versioned JSON block arrays (`body_format = 'json_blocks'`, `body_schema_version = 'v1'`).
2. **Block Types:** Headings (`h1`-`h4`), Paragraphs, Code Blocks (language + code), Callouts (type + text), Image/Artifact embeds, Quotes, Lists, and Evidence/Capability relationship tags.
3. **Automatic Export:** Every published revision automatically compiles to portable Markdown (`.md`) files with frontmatter for offline backup, export archives, and git persistence.
4. **Security:** Eliminates client-side or server-side MDX evaluation (satisfies CRITICAL-05). HTML inside blocks is escaped by default.

## Consequences

- Dashboard editor reads and writes structured JSON block arrays.
- Schema changes produce deterministic migration transformations on JSON block snapshots.
- Export pipeline renders standard GitHub-Flavored Markdown.
- No unsafe execution surface in published content.
