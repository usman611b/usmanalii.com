/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import type { EvidenceItemEntity, ArtifactEntity } from '@usmanalii/domain';
import {
  computeContentHash,
  validateVerificationStateTransition,
  mergeWithOwnerOverrideProtection,
  validateEvidenceLinkTarget,
  filterPublicEvidence,
  filterPublicArtifacts,
  isBoundaryTimestampPublic,
} from './index.js';

describe('Milestone M3 — Evidence Ledger & Provenance Engine Tests', () => {
  it('1. computeContentHash generates deterministic SHA-256 hex string', async () => {
    const hash1 = await computeContentHash('test payload');
    const hash2 = await computeContentHash('test payload');
    const hash3 = await computeContentHash('different payload');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('2. validateVerificationStateTransition permits valid transitions and blocks invalid ones', () => {
    expect(validateVerificationStateTransition('unverified', 'owner_verified').valid).toBe(true);
    expect(validateVerificationStateTransition('owner_verified', 'disputed').valid).toBe(true);
    expect(validateVerificationStateTransition('disputed', 'revoked').valid).toBe(true);
    expect(validateVerificationStateTransition('archived', 'owner_verified').valid).toBe(false);
  });

  it('3. mergeWithOwnerOverrideProtection preserves owner-authored content against silent sync overwrite', () => {
    const existing: Partial<EvidenceItemEntity> = {
      id: 'ev-1' as any,
      title: 'Owner Authored Title',
      description: 'Owner Authored Description',
      verificationState: 'owner_verified',
      authorshipNote: 'owner_modified',
    };

    const incomingSync: Partial<EvidenceItemEntity> = {
      title: 'Incoming GitHub Title',
      description: 'Incoming GitHub Description',
      canonicalLocator: 'https://github.com/repo/commit/123',
    };

    const merged = mergeWithOwnerOverrideProtection(existing as EvidenceItemEntity, incomingSync, false);

    expect(merged.title).toBe('Owner Authored Title');
    expect(merged.description).toBe('Owner Authored Description');
    expect(merged.canonicalLocator).toBe('https://github.com/repo/commit/123');
  });

  it('4. validateEvidenceLinkTarget enforces single-target edge invariant', () => {
    expect(validateEvidenceLinkTarget({ targetType: 'project', targetId: 'proj-1' as any }).valid).toBe(true);
    expect(validateEvidenceLinkTarget({ targetType: 'claim', targetId: 'claim-1' as any }).valid).toBe(true);
    expect(validateEvidenceLinkTarget({ targetType: 'invalid' as any, targetId: 'id' as any }).valid).toBe(false);
  });

  it('5. filterPublicEvidence excludes private, disputed, revoked, archived, and future embargoed items', () => {
    const now = new Date();
    const futureEmbargo = new Date(now.getTime() + 86400 * 1000).toISOString();

    const publicItem: Partial<EvidenceItemEntity> = {
      id: 'ev-1' as any,
      visibility: 'public',
      verificationState: 'owner_verified',
      archivedAt: null,
      embargoUntil: null,
    };

    const privateItem: Partial<EvidenceItemEntity> = { ...publicItem, id: 'ev-2' as any, visibility: 'private' };
    const disputedItem: Partial<EvidenceItemEntity> = { ...publicItem, id: 'ev-3' as any, verificationState: 'disputed' };
    const revokedItem: Partial<EvidenceItemEntity> = { ...publicItem, id: 'ev-4' as any, verificationState: 'revoked' };
    const archivedItem: Partial<EvidenceItemEntity> = { ...publicItem, id: 'ev-5' as any, archivedAt: new Date().toISOString() as any };
    const embargoedItem: Partial<EvidenceItemEntity> = { ...publicItem, id: 'ev-6' as any, embargoUntil: futureEmbargo as any };

    const items = [publicItem, privateItem, disputedItem, revokedItem, archivedItem, embargoedItem] as EvidenceItemEntity[];

    const publicEligible = filterPublicEvidence(items, now);
    expect(publicEligible).toHaveLength(1);
    expect(publicEligible[0]!.id).toBe('ev-1');
  });

  it('6. filterPublicArtifacts excludes private, deleted, and archived artifacts', () => {
    const publicArt: Partial<ArtifactEntity> = { id: 'art-1' as any, visibility: 'public', deletedAt: null, archivedAt: null };
    const privateArt: Partial<ArtifactEntity> = { ...publicArt, id: 'art-2' as any, visibility: 'private' };
    const deletedArt: Partial<ArtifactEntity> = { ...publicArt, id: 'art-3' as any, deletedAt: new Date().toISOString() as any };
    const archivedArt: Partial<ArtifactEntity> = { ...publicArt, id: 'art-4' as any, archivedAt: new Date().toISOString() as any };

    const arts = [publicArt, privateArt, deletedArt, archivedArt] as ArtifactEntity[];

    const publicEligible = filterPublicArtifacts(arts);
    expect(publicEligible).toHaveLength(1);
    expect(publicEligible[0]!.id).toBe('art-1');
  });

  it('7. validateVerificationStateTransition disallows invalid transitions like revoked -> source_verified', () => {
    expect(validateVerificationStateTransition('revoked', 'source_verified').valid).toBe(false);
    expect(validateVerificationStateTransition('archived', 'automatically_observed').valid).toBe(false);
  });

  it('8. validateEvidenceLinkTarget rejects null, empty, or invalid targets', () => {
    expect(validateEvidenceLinkTarget(null as any).valid).toBe(false);
    expect(validateEvidenceLinkTarget({} as any).valid).toBe(false);
    expect(validateEvidenceLinkTarget({ targetType: 'capability' } as any).valid).toBe(false);
  });

  it('9. isBoundaryTimestampPublic correctly evaluates exact-now, past, and future boundaries', () => {
    const now = new Date('2026-08-09T00:00:00.000Z');
    const past = new Date('2026-08-08T23:59:59.000Z').toISOString();
    const exactNow = new Date('2026-08-09T00:00:00.000Z').toISOString();
    const future = new Date('2026-08-09T00:00:01.000Z').toISOString();

    expect(isBoundaryTimestampPublic(null, now)).toBe(true);
    expect(isBoundaryTimestampPublic(past, now)).toBe(true);
    expect(isBoundaryTimestampPublic(exactNow, now)).toBe(true);
    expect(isBoundaryTimestampPublic(future, now)).toBe(false);
  });
});
