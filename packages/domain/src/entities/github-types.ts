/**
 * Domain entity types for GitHub Evidence Integration — Milestone M6.
 */

import type { EntityId, ISODateTime, Visibility } from './index.js';

export type GitHubVerificationStatus = 'unverified' | 'verified' | 'disputed' | 'revoked';

export interface GitHubOwnerIdentityEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly githubUserId: number;
  readonly githubLogin: string;
  readonly commitEmails: readonly string[];
  readonly verificationStatus: GitHubVerificationStatus;
  readonly ownerApproval: boolean;
  readonly lastVerifiedAt: ISODateTime | null;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export type GitHubSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'stale'
  | 'error'
  | 'access_revoked';

export interface GitHubRepositoryEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly githubRepoId: number;
  readonly ownerLogin: string;
  readonly name: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly isPrivate: boolean;
  readonly isFork: boolean;
  readonly isArchived: boolean;
  readonly defaultBranch: string;
  readonly primaryLanguage: string | null;
  readonly topics: readonly string[];
  readonly homepageUrl: string | null;
  readonly htmlUrl: string;
  readonly pushedAt: ISODateTime | null;
  readonly createdAtGithub: ISODateTime | null;
  readonly updatedAtGithub: ISODateTime | null;
  readonly licenseSpdxId: string | null;
  readonly parentRepoFullName: string | null;
  readonly selectedForSync: boolean;
  readonly linkedProjectId: EntityId | null;
  readonly lastSyncedAt: ISODateTime | null;
  readonly syncStatus: GitHubSyncStatus;
  readonly etag: string | null;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export type GitHubExternalObjectType =
  | 'repository'
  | 'commit'
  | 'pull_request'
  | 'review'
  | 'release'
  | 'deployment';

export type GitHubUpstreamState =
  | 'discovered'
  | 'imported'
  | 'unchanged'
  | 'updated'
  | 'stale'
  | 'missing_upstream'
  | 'access_revoked';

export interface GitHubImportedObjectEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly repositoryId: EntityId;
  readonly externalType: GitHubExternalObjectType;
  readonly externalId: string;
  readonly contentHash: string;
  readonly rawPayloadSanitized: string;
  readonly upstreamState: GitHubUpstreamState;
  readonly sourceUrl: string;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export type AttributionStatus =
  | 'verified_owner'
  | 'unverified_author'
  | 'bot_ignored'
  | 'ambiguous';

export type CandidateReviewState =
  | 'pending_review'
  | 'accepted'
  | 'edited_and_accepted' | 'rejected'
  | 'superseded'
  | 'expired';

export interface EvidenceCandidateEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly provider: 'github';
  readonly externalType: GitHubExternalObjectType;
  readonly externalId: string;
  readonly repositoryId: EntityId | null;
  readonly sourceUrl: string;
  readonly sourceCreatedAt: ISODateTime | null;
  readonly capturedAt: ISODateTime;
  readonly contentHash: string;
  readonly attributionStatus: AttributionStatus;
  readonly candidateType: string;
  readonly candidateTitle: string;
  readonly candidateDescription: string | null;
  readonly suggestedRelationshipsJson: string;
  readonly provenanceJson: string;
  readonly upstreamVisibility: 'private' | 'public';
  readonly reviewState: CandidateReviewState;
  readonly rejectionReason: string | null;
  readonly fingerprint: string;
  readonly acceptedEvidenceItemId: EntityId | null;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export interface GitHubSyncCheckpointEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly repositoryId: EntityId;
  readonly resourceType: GitHubExternalObjectType;
  readonly cursor: string | null;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly updatedAt: ISODateTime;
}

export interface GitHubRateLimitEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly limitTotal: number;
  readonly remaining: number;
  readonly resetAt: ISODateTime;
  readonly used: number;
  readonly resourceCategory: string;
  readonly capturedAt: ISODateTime;
}

export interface ActivityHeatmapCell {
  readonly date: string; // YYYY-MM-DD in target timezone
  readonly count: number;
  readonly intensity: 0 | 1 | 2 | 3 | 4; // count buckets for accessible styling
  readonly eventTypes: readonly string[];
}

export interface ActivityProjection {
  readonly timezone: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly cells: readonly ActivityHeatmapCell[];
  readonly totalActivities: number;
  readonly activeDaysCount: number;
}
