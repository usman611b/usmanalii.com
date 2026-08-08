/**
 * Synthetic test fixtures.
 *
 * MANDATORY RULES (Master Prompt §118):
 *  1. These fixtures contain ONLY fictional data.
 *  2. ZERO invented facts about Usman Ali (name, employer, university, role,
 *     project, credential, outcome, publication, or personal detail).
 *  3. Cover all visibility states: private, restricted, unlisted, public.
 *  4. Cover all publication states: draft, review, approved, scheduled, published, unlisted, archived.
 *  5. Cover all evidence health states.
 *  6. Cover all capability maturity states.
 *  7. Include intentionally invalid records for negative tests.
 *
 * These fixtures may be used in:
 *  - Unit tests for domain rules
 *  - Authorization negative tests
 *  - Public/private projection tests
 *  - Local and preview environments (NEVER production or staging with real data)
 */

import type {
  EntityId,
  ISODateTime,
  SkillEntity,
  CapabilityEntity,
  EvidenceItemEntity,
  ProfileEntity,
  ActivityEntity,
} from '@usmanalii/domain';
import { DEFAULT_VISIBILITY } from '@usmanalii/domain';

// ---------------------------------------------------------------------------
// ID utilities for fixtures
// ---------------------------------------------------------------------------

/** Creates a fixture EntityId — sequential for readable test output. */
function fid(n: number): EntityId {
  return `00000000-0000-0000-0000-${String(n).padStart(12, '0')}` as EntityId;
}

function fts(year: number, month: number, day: number): ISODateTime {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z` as ISODateTime;
}

const FIXTURE_OWNER_ID = fid(1);
const DIFFERENT_OWNER_ID = fid(999); // for IDOR tests

// ---------------------------------------------------------------------------
// Profile fixtures
// ---------------------------------------------------------------------------

export const profiles = {
  /** A valid owner profile with approved content. */
  ownerProfile: {
    id: fid(100),
    ownerId: FIXTURE_OWNER_ID,
    displayName: 'Fixture User',         // NOT Usman Ali
    headline: 'Software Engineer',        // generic
    bio: 'Works on software projects.',   // generic
    currentFocus: 'Building things.',     // generic
    contactEmail: null,                   // private — not in public DTOs
    contactUrl: null,
    timezone: 'UTC',
    visibility: 'public' as const,
    createdAt: fts(2024, 1, 1),
    updatedAt: fts(2024, 1, 1),
  } satisfies ProfileEntity,

  /** A private profile — for privacy projection tests. */
  privateProfile: {
    id: fid(101),
    ownerId: FIXTURE_OWNER_ID,
    displayName: 'Fixture User',
    headline: null,
    bio: null,
    currentFocus: null,
    contactEmail: null,
    contactUrl: null,
    timezone: 'UTC',
    visibility: DEFAULT_VISIBILITY,      // 'private' — default invariant test
    createdAt: fts(2024, 1, 1),
    updatedAt: fts(2024, 1, 1),
  } satisfies ProfileEntity,
} as const;

// ---------------------------------------------------------------------------
// Skill fixtures (taxonomy only — no proficiency)
// ---------------------------------------------------------------------------

export const skills = {
  /** A published public skill — generic technology name. */
  publicSkill: {
    id: fid(200),
    ownerId: FIXTURE_OWNER_ID,
    name: 'Generic Technology A',
    slug: 'generic-technology-a',
    description: 'A generic technology used in projects.',
    parentId: null,
    aliases: [],
    visibility: 'public' as const,
    createdAt: fts(2024, 1, 1),
    updatedAt: fts(2024, 1, 1),
    archivedAt: null,
  } satisfies SkillEntity,

  /** A private skill — must not appear in public queries. */
  privateSkill: {
    id: fid(201),
    ownerId: FIXTURE_OWNER_ID,
    name: 'Private Skill',
    slug: 'private-skill',
    description: 'A private skill not yet disclosed.',
    parentId: null,
    aliases: [],
    visibility: DEFAULT_VISIBILITY,      // 'private'
    createdAt: fts(2024, 2, 1),
    updatedAt: fts(2024, 2, 1),
    archivedAt: null,
  } satisfies SkillEntity,

  /** A different owner's skill — for IDOR tests. */
  differentOwnerSkill: {
    id: fid(202),
    ownerId: DIFFERENT_OWNER_ID,         // different owner
    name: 'Other Owner Skill',
    slug: 'other-owner-skill',
    description: null,
    parentId: null,
    aliases: [],
    visibility: 'private' as const,
    createdAt: fts(2024, 3, 1),
    updatedAt: fts(2024, 3, 1),
    archivedAt: null,
  } satisfies SkillEntity,
} as const;

// ---------------------------------------------------------------------------
// Capability fixtures — all maturity states, no percentage
// ---------------------------------------------------------------------------

const capabilityBase = {
  ownerId: FIXTURE_OWNER_ID,
  slug: 'generic-capability',
  description: 'Can perform a bounded generic task.',
  qualifyingEvidenceRules: '{}',
  maturityRuleVersion: 'v1.0',
  visibility: 'public' as const,
  state: 'published' as const,
  skillIds: [fid(200)],
  lastReviewedAt: null,
  createdAt: fts(2024, 1, 1),
  updatedAt: fts(2024, 1, 1),
  archivedAt: null,
};

export const capabilities = {
  notEnoughEvidence: {
    ...capabilityBase,
    id: fid(300),
    title: 'Generic Task (no evidence)',
    maturity: 'not_enough_evidence' as const,
    maturityRationale: 'No qualifying evidence has been added yet.',
  } satisfies CapabilityEntity,

  observed: {
    ...capabilityBase,
    id: fid(301),
    title: 'Generic Task (observed)',
    maturity: 'observed' as const,
    maturityRationale: 'Observed performing in a controlled context.',
  } satisfies CapabilityEntity,

  applied: {
    ...capabilityBase,
    id: fid(302),
    title: 'Generic Task (applied)',
    maturity: 'applied' as const,
    maturityRationale: 'Applied in a real project context with evidence.',
  } satisfies CapabilityEntity,

  delivered: {
    ...capabilityBase,
    id: fid(303),
    title: 'Generic Task (delivered)',
    maturity: 'delivered' as const,
    maturityRationale: 'Delivered with measurable outcome and evidence.',
  } satisfies CapabilityEntity,

  /** Private capability — must not appear in public queries. */
  privateCapability: {
    ...capabilityBase,
    id: fid(304),
    title: 'Private Generic Task',
    maturity: 'practiced' as const,
    maturityRationale: 'Draft capability not yet published.',
    visibility: DEFAULT_VISIBILITY,
    state: 'draft' as const,
  } satisfies CapabilityEntity,
} as const;

// ---------------------------------------------------------------------------
// Evidence fixtures — all verification states
// ---------------------------------------------------------------------------

const evidenceBase = {
  ownerId: FIXTURE_OWNER_ID,
  provider: null,
  externalId: null,
  description: 'A generic evidence item.',
  providerCreatedAt: null,
  providerUpdatedAt: null,
  contentHash: null,
  authorshipNote: 'Completed independently.',
  provenanceSnapshot: null,
  licenseMetadata: null,
  confidentialityMetadata: null,
  verificationMethod: null,
  verifiedBy: null,
  verifiedAt: null,
  qualitySignals: null,
  embargoUntil: null,
  versionNo: 1,
  createdAt: fts(2024, 1, 15),
  updatedAt: fts(2024, 1, 15),
  archivedAt: null,
} as const;

export const evidenceItems = {
  ownerVerified: {
    ...evidenceBase,
    id: fid(400),
    evidenceType: 'work_record' as const,
    sourceType: 'owner_attested' as const,
    canonicalLocator: null,
    title: 'Generic Work Record (owner verified)',
    capturedAt: fts(2024, 1, 15),
    occurredAt: fts(2024, 1, 10),
    verificationState: 'owner_verified' as const,
    visibility: 'public' as const,
  } satisfies EvidenceItemEntity,

  unreviewed: {
    ...evidenceBase,
    id: fid(401),
    evidenceType: 'artifact' as const,
    sourceType: 'file' as const,
    canonicalLocator: null,
    title: 'Generic Artifact (unreviewed)',
    capturedAt: fts(2024, 2, 1),
    occurredAt: null,
    verificationState: 'unreviewed' as const,
    visibility: DEFAULT_VISIBILITY,
  } satisfies EvidenceItemEntity,

  broken: {
    ...evidenceBase,
    id: fid(402),
    evidenceType: 'commit' as const,
    sourceType: 'github' as const,
    canonicalLocator: 'https://github.com/example/repo/commit/abc123',
    title: 'Generic Commit (broken link)',
    capturedAt: fts(2024, 3, 1),
    occurredAt: fts(2024, 2, 28),
    verificationState: 'broken' as const,
    visibility: 'public' as const,
  } satisfies EvidenceItemEntity,

  archived: {
    ...evidenceBase,
    id: fid(403),
    evidenceType: 'deployment' as const,
    sourceType: 'manual' as const,
    canonicalLocator: null,
    title: 'Generic Deployment (archived)',
    capturedAt: fts(2024, 1, 1),
    occurredAt: fts(2024, 1, 1),
    verificationState: 'archived' as const,
    visibility: 'private' as const,
    archivedAt: fts(2024, 6, 1),
  } satisfies EvidenceItemEntity,
} as const;

// ---------------------------------------------------------------------------
// Activity fixtures — for heatmap tests (NOT competence scores)
// ---------------------------------------------------------------------------

export const activities = {
  publicActivity: {
    id: fid(500),
    ownerId: FIXTURE_OWNER_ID,
    activityType: 'journal_entry' as const,
    occurredAt: fts(2024, 1, 15),
    capturedAt: fts(2024, 1, 15),
    sourceIdentity: 'fixture-activity-001',
    dedupKey: 'fixture-dedup-001',
    visibility: 'public' as const,
    isExcluded: false,
    visualizationPoints: 1,
    entityRef: null,
  } satisfies ActivityEntity,

  privateActivity: {
    id: fid(501),
    ownerId: FIXTURE_OWNER_ID,
    activityType: 'evidence_captured' as const,
    occurredAt: fts(2024, 2, 1),
    capturedAt: fts(2024, 2, 1),
    sourceIdentity: 'fixture-activity-002',
    dedupKey: 'fixture-dedup-002',
    visibility: DEFAULT_VISIBILITY,     // private — must not leak in public aggregates
    isExcluded: false,
    visualizationPoints: 1,
    entityRef: null,
  } satisfies ActivityEntity,

  excludedActivity: {
    id: fid(502),
    ownerId: FIXTURE_OWNER_ID,
    activityType: 'other' as const,
    occurredAt: fts(2024, 3, 1),
    capturedAt: fts(2024, 3, 1),
    sourceIdentity: null,
    dedupKey: null,
    visibility: 'public' as const,
    isExcluded: true,                   // excluded — must not appear in public heatmap
    visualizationPoints: 0,
    entityRef: null,
  } satisfies ActivityEntity,
} as const;

// ---------------------------------------------------------------------------
// Constants for tests
// ---------------------------------------------------------------------------

export const FIXTURE_OWNER_ID_VALUE = FIXTURE_OWNER_ID;
export const DIFFERENT_OWNER_ID_VALUE = DIFFERENT_OWNER_ID;
