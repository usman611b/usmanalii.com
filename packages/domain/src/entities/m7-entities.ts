/**
 * @file Milestone M7 Professional Identity & Résumé Engine Domain Entity Types
 */

import type { EntityId, ISODate, ISODateTime, PublicationState, Visibility } from './index.js';

export type AvailabilityState = 'available' | 'open' | 'unavailable' | 'busy';

export type PublicationEligibility = 'eligible' | 'ineligible' | 'pending_review';

export interface ProfileExtensionEntity {
  readonly availabilityState: AvailabilityState;
  readonly preferredRoles: string | null;
  readonly profileImageUrl: string | null;
  readonly resumeAssetUrl: string | null;
  readonly location: string | null;
}

export interface ExperienceRecordEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly company: string;
  readonly roleTitle: string;
  readonly location: string | null;
  readonly startDate: ISODate;
  readonly endDate: ISODate | null;
  readonly isCurrent: boolean;
  readonly description: string | null;
  readonly keyAchievements: readonly string[];
  readonly visibility: Visibility;
  readonly state: PublicationState;
  readonly publicationEligibility: PublicationEligibility;
  readonly ordering: number;
  readonly versionNo: number;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly archivedAt: ISODateTime | null;
}

export interface EducationRecordEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly institution: string;
  readonly degree: string;
  readonly fieldOfStudy: string | null;
  readonly startDate: ISODate;
  readonly endDate: ISODate | null;
  readonly isCurrent: boolean;
  readonly gradeOrHonors: string | null;
  readonly description: string | null;
  readonly visibility: Visibility;
  readonly state: PublicationState;
  readonly publicationEligibility: PublicationEligibility;
  readonly ordering: number;
  readonly versionNo: number;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly archivedAt: ISODateTime | null;
}

export interface CredentialRecordEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly name: string;
  readonly issuingOrganization: string;
  readonly credentialId: string | null;
  readonly credentialUrl: string | null;
  readonly issueDate: ISODate;
  readonly expirationDate: ISODate | null;
  readonly visibility: Visibility;
  readonly state: PublicationState;
  readonly publicationEligibility: PublicationEligibility;
  readonly ordering: number;
  readonly versionNo: number;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly archivedAt: ISODateTime | null;
}

export type ClaimSupportTargetType =
  | 'evidence'
  | 'capability'
  | 'skill'
  | 'project'
  | 'engineering_record'
  | 'experience'
  | 'education'
  | 'credential';

export interface ClaimSupportEntity {
  readonly id: EntityId;
  readonly claimId: EntityId;
  readonly ownerId: EntityId;
  readonly targetType: ClaimSupportTargetType;
  readonly targetId: EntityId;
  readonly createdAt: ISODateTime;
}

export type ResumeTargetAudience =
  'general' | 'software_engineering' | 'recruiter_summary' | 'project_focused' | 'job_specific';

export type ResumeState = 'draft' | 'preview' | 'published' | 'archived';

export interface ResumeVariantEntity {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly title: string;
  readonly slug: string;
  readonly privateDescription: string | null;
  readonly targetAudience: ResumeTargetAudience;
  readonly template: string;
  readonly visibility: Visibility;
  readonly state: ResumeState;
  readonly isPrimary: boolean;
  readonly presentationConfig: string;
  readonly versionNo: number;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly archivedAt: ISODateTime | null;
}

export type ResumeSectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'credentials'
  | 'claims'
  | 'skills'
  | 'capabilities'
  | 'projects'
  | 'custom';

export interface ResumeVariantSectionEntity {
  readonly id: EntityId;
  readonly variantId: EntityId;
  readonly ownerId: EntityId;
  readonly sectionKey: ResumeSectionKey;
  readonly title: string;
  readonly included: boolean;
  readonly ordering: number;
  readonly customHeading: string | null;
  readonly configJson: string;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export type ResumeItemType =
  'experience' | 'education' | 'credential' | 'claim' | 'skill' | 'capability' | 'project';

export interface ResumeVariantItemEntity {
  readonly id: EntityId;
  readonly variantId: EntityId;
  readonly sectionId: EntityId;
  readonly ownerId: EntityId;
  readonly itemType: ResumeItemType;
  readonly itemId: EntityId;
  readonly customWording: string | null;
  readonly included: boolean;
  readonly ordering: number;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export interface ResumeVariantVersionEntity {
  readonly id: EntityId;
  readonly variantId: EntityId;
  readonly ownerId: EntityId;
  readonly versionNo: number;
  readonly snapshotJson: string;
  readonly changeSummary: string | null;
  readonly createdAt: ISODateTime;
}
