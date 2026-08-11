import { z } from 'zod';

/**
 * Shared API contract schemas using Zod.
 *
 * SECURITY: These schemas define what is ALLOWED through the API boundary.
 * - `owner_id` is NEVER accepted from client requests (validated structurally here)
 * - All request schemas are allowlisted — no passthrough
 * - Public DTOs expose only safe fields
 *
 * Sections:
 *  - API versioning: /api/v1/ (Architecture §10)
 *  - Zod validation at every request boundary (Security §9)
 *  - Explicit public DTO allowlists (Master Prompt security rules)
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const EntityIdSchema = z.string().uuid('Entity ID must be a valid UUID').brand('EntityId');

export const ISODateTimeSchema = z.string().datetime({ offset: true }).brand('ISODateTime');

export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
  .brand('ISODate');

// ---------------------------------------------------------------------------
// Visibility and state schemas
// ---------------------------------------------------------------------------

export const VisibilitySchema = z.enum(['private', 'restricted', 'unlisted', 'public']);
export const PublicationStateSchema = z.enum([
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
  'unlisted',
  'archived',
]);

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly nextCursor: string | null;
  readonly total?: number; // only when cheap to compute
}

// ---------------------------------------------------------------------------
// Error response — stable machine codes
// Architecture §8: "Stable machine error codes"
// Architecture §8: "JSON errors without stack traces or entity-existence leakage"
// ---------------------------------------------------------------------------

export const ErrorCodeSchema = z.enum([
  // Auth
  'AUTH_REQUIRED',
  'AUTH_INVALID_TOKEN',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_OWNER_MISMATCH',
  // Authorization
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND', // same as 404 — no existence leakage for private records
  // Validation
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  // Business
  'CLAIM_INTEGRITY_FAILED',
  'EVIDENCE_LINK_INVALID_TARGET',
  'NUMERIC_PROFICIENCY_PROHIBITED',
  'UNSUPPORTED_CLAIM_CANNOT_PUBLISH',
  // Server
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly requestId: string;
  // SECURITY: Never include stack traces, private entity names or internal state
}

// ---------------------------------------------------------------------------
// SECURITY: Public DTO allowlists
// These types define EXACTLY what fields are safe to expose publicly.
// Never expose: owner_id, private metadata, draft content, internal IDs from
// private records, evidence provenance for private evidence, R2 keys.
// ---------------------------------------------------------------------------

/** Public-safe skill summary. */
export interface PublicSkillDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly parentId: string | null;
  readonly publicCapabilityCount: number; // count of public capabilities only
}

/** Public-safe capability summary. */
export interface PublicCapabilityDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly maturity: string; // descriptive only — never numeric
  readonly maturityRationale: string;
  readonly lastReviewedAt: string | null;
  readonly publicEvidenceCount: number;
  readonly skillNames: readonly string[];
  // INVARIANT: No proficiency percentage or score
}

/** Public-safe evidence summary. */
export interface PublicEvidenceDto {
  readonly id: string;
  readonly evidenceType: string;
  readonly sourceType: string;
  readonly provider: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly canonicalLocator: string | null; // only for public/verified sources
  readonly verificationState: string;
  readonly occurredAt: string | null;
  // SECURITY: provenanceSnapshot, contentHash, externalId NOT included
  // SECURITY: R2 keys NOT included
}

/** Public-safe profile. */
export interface PublicProfileDto {
  readonly displayName: string;
  readonly headline: string | null;
  readonly bio: string | null;
  readonly currentFocus: string | null;
  readonly availabilityState: string;
  readonly preferredRoles: string | null;
  readonly profileImageUrl: string | null;
  readonly resumeAssetUrl: string | null;
  readonly location: string | null;
  readonly timezone: string;
  readonly contactUrl: string | null;
  // SECURITY: contactEmail NOT included (served separately via contact endpoint)
  // SECURITY: ownerId NOT included
}

export interface PublicExperienceDto {
  readonly id: string;
  readonly company: string;
  readonly roleTitle: string;
  readonly location: string | null;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly isCurrent: boolean;
  readonly description: string | null;
  readonly keyAchievements: readonly string[];
  readonly ordering: number;
}

export interface PublicEducationDto {
  readonly id: string;
  readonly institution: string;
  readonly degree: string;
  readonly fieldOfStudy: string | null;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly isCurrent: boolean;
  readonly gradeOrHonors: string | null;
  readonly description: string | null;
  readonly ordering: number;
}

export interface PublicCredentialDto {
  readonly id: string;
  readonly name: string;
  readonly issuingOrganization: string;
  readonly credentialId: string | null;
  readonly credentialUrl: string | null;
  readonly issueDate: string;
  readonly expirationDate: string | null;
  readonly ordering: number;
}

export interface PublicClaimDto {
  readonly id: string;
  readonly wording: string;
  readonly audience: string;
  readonly context: string | null;
  readonly isBackgroundStatementException: boolean;
  readonly healthySupportCount: number;
  readonly supports: readonly {
    readonly targetType: string;
    readonly targetId: string;
  }[];
}

export interface PublicResumeVariantDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly targetAudience: string;
  readonly template: string;
  readonly state: string;
  readonly versionNo: number;
  readonly sections: readonly {
    readonly id: string;
    readonly sectionKey: string;
    readonly title: string;
    readonly customHeading: string | null;
    readonly ordering: number;
    readonly items: readonly {
      readonly id: string;
      readonly itemType: string;
      readonly itemId: string;
      readonly customWording: string | null;
      readonly ordering: number;
      readonly recordDetails?: unknown;
    }[];
  }[];
}

export interface PublicRecruiterProjectionDto {
  readonly profile: PublicProfileDto | null;
  readonly summary: string | null;
  readonly featuredExperience: readonly PublicExperienceDto[];
  readonly featuredEducation: readonly PublicEducationDto[];
  readonly featuredCredentials: readonly PublicCredentialDto[];
  readonly featuredCapabilities: readonly PublicCapabilityDto[];
  readonly featuredSkills: readonly PublicSkillDto[];
  readonly featuredProjects: readonly unknown[];
  readonly approvedClaims: readonly PublicClaimDto[];
  readonly resumeAssetUrl: string | null;
  readonly contactUrl: string | null;
}

// ---------------------------------------------------------------------------
// Request schemas (validated at Worker boundary)
// SECURITY: None of these accept owner_id from client
// ---------------------------------------------------------------------------

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  headline: z.string().max(250).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  currentFocus: z.string().max(500).nullable().optional(),
  availabilityState: z.enum(['available', 'open', 'unavailable', 'busy']).optional(),
  preferredRoles: z.string().max(500).nullable().optional(),
  profileImageUrl: z.string().url().max(500).nullable().optional(),
  resumeAssetUrl: z.string().url().max(500).nullable().optional(),
  location: z.string().max(150).nullable().optional(),
  timezone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(254).nullable().optional(),
  contactUrl: z.string().url().max(500).nullable().optional(),
  visibility: VisibilitySchema.optional(),
  versionNo: z.number().int().min(1),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const CreateExperienceRequestSchema = z.object({
  company: z.string().min(1).max(150),
  roleTitle: z.string().min(1).max(150),
  location: z.string().max(150).nullable().optional(),
  startDate: ISODateSchema,
  endDate: ISODateSchema.nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000).nullable().optional(),
  keyAchievements: z.array(z.string().max(500)).default([]),
  visibility: VisibilitySchema.default('private'),
  ordering: z.number().int().default(0),
});

export type CreateExperienceRequest = z.infer<typeof CreateExperienceRequestSchema>;

export const UpdateExperienceRequestSchema = CreateExperienceRequestSchema.partial().extend({
  versionNo: z.number().int().min(1),
  state: PublicationStateSchema.optional(),
});

export type UpdateExperienceRequest = z.infer<typeof UpdateExperienceRequestSchema>;

export const CreateEducationRequestSchema = z.object({
  institution: z.string().min(1).max(150),
  degree: z.string().min(1).max(150),
  fieldOfStudy: z.string().max(150).nullable().optional(),
  startDate: ISODateSchema,
  endDate: ISODateSchema.nullable().optional(),
  isCurrent: z.boolean().default(false),
  gradeOrHonors: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: VisibilitySchema.default('private'),
  ordering: z.number().int().default(0),
});

export type CreateEducationRequest = z.infer<typeof CreateEducationRequestSchema>;

export const UpdateEducationRequestSchema = CreateEducationRequestSchema.partial().extend({
  versionNo: z.number().int().min(1),
  state: PublicationStateSchema.optional(),
});

export type UpdateEducationRequest = z.infer<typeof UpdateEducationRequestSchema>;

export const CreateCredentialRequestSchema = z.object({
  name: z.string().min(1).max(150),
  issuingOrganization: z.string().min(1).max(150),
  credentialId: z.string().max(150).nullable().optional(),
  credentialUrl: z.string().url().max(500).nullable().optional(),
  issueDate: ISODateSchema,
  expirationDate: ISODateSchema.nullable().optional(),
  visibility: VisibilitySchema.default('private'),
  ordering: z.number().int().default(0),
});

export type CreateCredentialRequest = z.infer<typeof CreateCredentialRequestSchema>;

export const UpdateCredentialRequestSchema = CreateCredentialRequestSchema.partial().extend({
  versionNo: z.number().int().min(1),
  state: PublicationStateSchema.optional(),
});

export type UpdateCredentialRequest = z.infer<typeof UpdateCredentialRequestSchema>;

export const CreateClaimRequestSchema = z.object({
  wording: z.string().min(1).max(500),
  audience: z.enum(['recruiter', 'technical', 'general', 'resume']),
  context: z.string().max(500).nullable().optional(),
  isBackgroundStatementException: z.boolean().default(false),
  backgroundStatementExceptionReason: z.string().max(500).nullable().optional(),
  visibility: VisibilitySchema.default('private'),
});

export type CreateClaimRequest = z.infer<typeof CreateClaimRequestSchema>;

export const UpdateClaimRequestSchema = CreateClaimRequestSchema.partial().extend({
  versionNo: z.number().int().min(1),
  approvalState: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired']).optional(),
  state: PublicationStateSchema.optional(),
  reviewDate: ISODateSchema.nullable().optional(),
});

export type UpdateClaimRequest = z.infer<typeof UpdateClaimRequestSchema>;

export const ClaimSupportRequestSchema = z.object({
  targetType: z.enum([
    'evidence',
    'capability',
    'skill',
    'project',
    'engineering_record',
    'experience',
    'education',
    'credential',
  ]),
  targetId: z.string().min(1).max(100),
});

export type ClaimSupportRequest = z.infer<typeof ClaimSupportRequestSchema>;

export const CreateResumeVariantRequestSchema = z.object({
  title: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/),
  privateDescription: z.string().max(1000).nullable().optional(),
  targetAudience: z
    .enum([
      'general',
      'software_engineering',
      'recruiter_summary',
      'project_focused',
      'job_specific',
    ])
    .default('general'),
  template: z.string().max(50).default('classic'),
  visibility: VisibilitySchema.default('private'),
});

export type CreateResumeVariantRequest = z.infer<typeof CreateResumeVariantRequestSchema>;

export const UpdateResumeVariantRequestSchema = CreateResumeVariantRequestSchema.partial().extend({
  versionNo: z.number().int().min(1),
  state: z.enum(['draft', 'preview', 'published', 'archived']).optional(),
  isPrimary: z.boolean().optional(),
  presentationConfig: z.string().max(5000).optional(),
});

export type UpdateResumeVariantRequest = z.infer<typeof UpdateResumeVariantRequestSchema>;

export const ContactFormSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  message: z.string().min(10).max(2000),
  turnstileToken: z.string().min(1), // Cloudflare Turnstile — required
  // SECURITY: No owner_id, no visibility, no publication state accepted
});

export type ContactFormRequest = z.infer<typeof ContactFormSchema>;

export const PublicSearchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['all', 'content', 'project', 'capability', 'evidence']).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  // SECURITY: No visibility filter accepted from client
});

export type PublicSearchRequest = z.infer<typeof PublicSearchSchema>;

// ---------------------------------------------------------------------------
// Evidence Ledger Zod Request Schemas (Gate 7 API & Security)
// SECURITY: None of these accept owner_id from client. Owner ID is server-resolved.
// ---------------------------------------------------------------------------

export const EvidenceTypeSchema = z.enum([
  'journal_entry',
  'source_code_contribution',
  'commit',
  'pull_request',
  'repository',
  'deployment',
  'project_artifact',
  'experiment',
  'adr',
  'debugging_lesson',
  'certification',
  'education_record',
  'employment_record',
  'external_publication',
  'manual_evidence',
  'work_record',
  'certificate',
  'publication',
  'contribution',
  'artifact',
  'other',
]);

export const EvidenceSourceTypeSchema = z.enum([
  'github',
  'url',
  'file',
  'manual',
  'integration',
  'owner_attested',
]);

export const EvidenceVerificationStateSchema = z.enum([
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
]);

export const CreateEvidenceRequestSchema = z.object({
  evidenceType: EvidenceTypeSchema,
  sourceType: EvidenceSourceTypeSchema,
  provider: z.string().max(100).nullable().optional(),
  externalId: z.string().max(200).nullable().optional(),
  canonicalLocator: z.string().url().max(500).nullable().optional(),
  title: z.string().min(1).max(250),
  description: z.string().max(2000).nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }).nullable().optional(),
  visibility: VisibilitySchema.default('private'),
  embargoUntil: z.string().datetime({ offset: true }).nullable().optional(),
});

export type CreateEvidenceRequest = z.infer<typeof CreateEvidenceRequestSchema>;

export const UpdateEvidenceRequestSchema = z.object({
  versionNo: z.number().int().min(1), // required for optimistic concurrency
  title: z.string().min(1).max(250).optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: VisibilitySchema.optional(),
  embargoUntil: z.string().datetime({ offset: true }).nullable().optional(),
});

export type UpdateEvidenceRequest = z.infer<typeof UpdateEvidenceRequestSchema>;

export const RecordVerificationEventSchema = z.object({
  newState: EvidenceVerificationStateSchema,
  verificationMethod: z.string().min(1).max(100),
  rationale: z.string().max(1000).nullable().optional(),
});

export type RecordVerificationEventRequest = z.infer<typeof RecordVerificationEventSchema>;

export const CreateEvidenceLinkRequestSchema = z.object({
  targetType: z.enum([
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
  ]),
  targetId: z.string().min(1).max(100),
  supportType: z.enum(['demonstrates', 'corroborates', 'historical', 'contradicts']),
  relevance: z.number().int().min(1).max(5).default(3),
  ordering: z.number().int().default(0),
  rationale: z.string().min(1).max(1000),
});

export type CreateEvidenceLinkRequest = z.infer<typeof CreateEvidenceLinkRequestSchema>;

export const CreateArtifactMetadataSchema = z.object({
  title: z.string().min(1).max(250),
  description: z.string().max(2000).nullable().optional(),
  artifactType: z.string().min(1).max(100),
  visibility: VisibilitySchema.default('private'),
});

export type CreateArtifactMetadataRequest = z.infer<typeof CreateArtifactMetadataSchema>;

// ---------------------------------------------------------------------------
// Milestone M7 — Professional Identity & Résumé Engine Contracts & DTOs
// ---------------------------------------------------------------------------

export const AvailabilityStateSchema = z.enum(['available', 'open', 'unavailable', 'busy']);
export type AvailabilityState = z.infer<typeof AvailabilityStateSchema>;
