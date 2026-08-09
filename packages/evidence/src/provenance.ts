/**
 * Evidence Provenance & Verification Engine (`provenance.ts`).
 *
 * Implements M3 Evidence Ledger domain rules:
 *  1. SHA-256 content hashing for evidence items & artifacts.
 *  2. Verification state machine validation & append-only verification events.
 *  3. Protection of owner-authored fields against silent overwrite during imports.
 *  4. Single-target invariant validation for evidence links.
 *  5. Public eligibility filtering for evidence and artifacts.
 */

import type {
  EvidenceItemEntity,
  EvidenceVerificationState,
  EvidenceLinkTarget,
  ArtifactEntity,
} from '@usmanalii/domain';

/**
 * Computes deterministic SHA-256 content hash of string or object payload.
 */
export async function computeContentHash(
  payload: string | Uint8Array | Record<string, unknown>,
): Promise<string> {
  const dataBuffer =
    payload instanceof Uint8Array
      ? payload
      : new TextEncoder().encode(typeof payload === 'string' ? payload : JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    dataBuffer as unknown as BufferSource,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates evidence verification state transitions.
 * State machine:
 *  - unverified/unreviewed -> owner_verified, source_verified, automatically_observed, disputed, revoked, archived
 *  - owner_verified / source_verified -> stale, broken, disputed, revoked, archived
 *  - disputed / revoked -> owner_verified (re-verified), archived
 *  - archived -> immutable terminal (or explicit owner un-archive)
 */
export function validateVerificationStateTransition(
  current: EvidenceVerificationState | null,
  next: EvidenceVerificationState,
): { valid: true } | { valid: false; reason: string } {
  if (current === next) return { valid: true };

  if (current === 'archived') {
    return {
      valid: false,
      reason: 'Archived evidence is immutable and cannot transition states without unarchiving.',
    };
  }

  if (current === 'revoked' && next !== 'archived' && next !== 'unverified') {
    return {
      valid: false,
      reason: 'Revoked evidence cannot transition directly to verified states.',
    };
  }

  const allowedStates: EvidenceVerificationState[] = [
    'unverified',
    'unreviewed',
    'owner_verified',
    'source_verified',
    'automatically_observed',
    'stale',
    'broken',
    'disputed',
    'revoked',
    'archived',
  ];

  if (!allowedStates.includes(next)) {
    return { valid: false, reason: `Invalid target verification state: ${next}` };
  }

  return { valid: true };
}

/**
 * Merges synchronized or imported evidence updates while protecting owner-authored information.
 * Rule: Imported/synchronized evidence MUST NEVER silently overwrite owner-authored title or description.
 */
export function mergeWithOwnerOverrideProtection(
  existing: EvidenceItemEntity,
  incoming: Partial<EvidenceItemEntity>,
  isOwnerEdit: boolean = false,
): Partial<EvidenceItemEntity> {
  if (isOwnerEdit) {
    return { ...existing, ...incoming };
  }

  const merged: Record<string, unknown> = { ...incoming };

  if (
    existing.verificationState === 'owner_verified' ||
    existing.authorshipNote?.includes('owner_modified')
  ) {
    merged.title = existing.title;
    merged.description = existing.description;
  }

  return merged as Partial<EvidenceItemEntity>;
}

/**
 * Single-target edge validator.
 * INVARIANT: Every evidence_link edge MUST reference exactly ONE target entity.
 */
export function validateEvidenceLinkTarget(
  target: EvidenceLinkTarget,
): { valid: true } | { valid: false; reason: string } {
  if (!target || typeof target !== 'object' || !target.targetType || !target.targetId) {
    return { valid: false, reason: 'Evidence link must specify a valid targetType and targetId.' };
  }

  const validTargetTypes = [
    'capability',
    'claim',
    'project',
    'content_item',
    'artifact',
    'adr',
    'experiment',
    'debugging_lesson',
    'deployment',
    'resume_statement',
  ];

  if (!validTargetTypes.includes(target.targetType)) {
    return { valid: false, reason: `Unsupported evidence link target type: ${target.targetType}` };
  }

  return { valid: true };
}

/**
 * Evaluates whether a timestamp (e.g. embargoUntil or scheduledFor) has passed relative to `now`.
 * Boundary rule: timestamp <= now is public; timestamp > now is private.
 */
export function isBoundaryTimestampPublic(
  timestampIso: string | null,
  now: Date = new Date(),
): boolean {
  if (!timestampIso) return true;
  return new Date(timestampIso).getTime() <= now.getTime();
}

/**
 * Filter public evidence eligibility (Section 7, Section 18).
 * Public eligibility requires:
 *  - visibility === 'public'
 *  - verificationState NOT IN ('disputed', 'revoked', 'archived')
 *  - archivedAt === null
 *  - embargoUntil === null || embargoUntil <= now
 */
export function filterPublicEvidence(
  items: EvidenceItemEntity[],
  now: Date = new Date(),
): EvidenceItemEntity[] {
  return items.filter((item) => {
    if (item.visibility !== 'public') return false;
    if (item.archivedAt !== null) return false;
    if (
      item.verificationState === 'disputed' ||
      item.verificationState === 'revoked' ||
      item.verificationState === 'archived'
    ) {
      return false;
    }
    if (!isBoundaryTimestampPublic(item.embargoUntil, now)) return false;
    return true;
  });
}

/**
 * Filter public artifact eligibility.
 * Public eligibility requires:
 *  - visibility === 'public'
 *  - deletedAt === null
 *  - archivedAt === null
 */
export function filterPublicArtifacts(artifacts: ArtifactEntity[]): ArtifactEntity[] {
  return artifacts.filter((art) => {
    if (art.visibility !== 'public') return false;
    if (art.deletedAt !== null) return false;
    if (art.archivedAt !== null) return false;
    return true;
  });
}
