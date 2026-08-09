# ADR-008: Backup Encryption and Off-Provider Destination

**Status:** Decided  
**Date:** 2026-08-08  
**Deciders:** Product Owner & Engineering  
**Depends on:** Technical Architecture §21, Security Threat Model §17

---

## Context

Structured database records, evidence manifests, and R2 artifacts must be backed up regularly to prevent data loss or lock-in while guaranteeing zero private data leakage.

## Decision

**Encrypted backup to Google Drive / OneDrive, plus a second encrypted local copy.**

1. **Encryption Standard:** Client-side AES-256-GCM authenticated encryption before payload leaves Cloudflare Workers. Passphrase key derived using PBKDF2/Argon2id.
2. **Off-Provider Target:** Cloudflare Cron Trigger generates encrypted database export + JSON artifact manifest + checksums, uploading to Google Drive / OneDrive via API adapter.
3. **Local Target:** Secondary copy stored on local/owner storage via export download CLI/script.
4. **Zero Unencrypted Exports:** Unencrypted database dumps or artifacts are **NEVER stored in GitHub** or public storage buckets.

## Consequences

- Full system can be reconstructed from Git codebase + encrypted database export + R2 artifact manifest.
- Backup encryption keys are managed strictly as Cloudflare Worker secrets.
- Backup operations produce immutable audit events (`event_type = 'backup_export'`).
