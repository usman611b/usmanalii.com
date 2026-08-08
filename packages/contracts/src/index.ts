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

export const EntityIdSchema = z
  .string()
  .uuid('Entity ID must be a valid UUID')
  .brand('EntityId');

export const ISODateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .brand('ISODateTime');

export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
  .brand('ISODate');

// ---------------------------------------------------------------------------
// Visibility and state schemas
// ---------------------------------------------------------------------------

export const VisibilitySchema = z.enum(['private', 'restricted', 'unlisted', 'public']);
export const PublicationStateSchema = z.enum([
  'draft', 'review', 'approved', 'scheduled', 'published', 'unlisted', 'archived',
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
  // SECURITY: contactEmail NOT included (served separately via contact endpoint)
  // SECURITY: ownerId NOT included
}

// ---------------------------------------------------------------------------
// Request schemas (validated at Worker boundary)
// SECURITY: None of these accept owner_id from client
// ---------------------------------------------------------------------------

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
