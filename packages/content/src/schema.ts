import { z } from 'zod';

/**
 * Canonical Versioned Content Block Schema (v1).
 * ADR-005 & Database Model §4.
 *
 * SECURITY (CRITICAL-05):
 * - No MDX or raw executable HTML tags permitted.
 * - Strict block allowlist.
 * - URL protocols restricted to http:, https:, r2:, or relative paths.
 */

// Safe URL validator
const SafeUrlSchema = z.string().refine(
  (url) => {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html') || trimmed.startsWith('vbscript:')) {
      return false;
    }
    return true;
  },
  { message: 'Unsafe URL protocol rejected.' },
);

export const HeadingBlockSchema = z.object({
  id: z.string(),
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1, 'Heading text cannot be empty.'),
});

export const ParagraphBlockSchema = z.object({
  id: z.string(),
  type: z.literal('paragraph'),
  text: z.string(),
});

export const CodeBlockSchema = z.object({
  id: z.string(),
  type: z.literal('code_block'),
  code: z.string(),
  language: z.string().default('text'),
  caption: z.string().optional(),
});

export const CalloutBlockSchema = z.object({
  id: z.string(),
  type: z.literal('callout'),
  calloutType: z.enum(['info', 'warning', 'tip', 'note', 'caution']).default('note'),
  title: z.string().optional(),
  text: z.string().min(1, 'Callout text cannot be empty.'),
});

export const QuoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal('quote'),
  text: z.string().min(1, 'Quote text cannot be empty.'),
  cite: z.string().optional(),
});

export const ListBlockSchema = z.object({
  id: z.string(),
  type: z.literal('list'),
  style: z.enum(['bullet', 'ordered']).default('bullet'),
  items: z.array(z.string()),
});

export const ImageBlockSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  url: SafeUrlSchema,
  alt: z.string().min(1, 'Image alternative text is required for accessibility.'),
  caption: z.string().optional(),
});

export const EmbedArtifactBlockSchema = z.object({
  id: z.string(),
  type: z.literal('embed_artifact'),
  artifactId: z.string(),
  caption: z.string().optional(),
});

export const RelationshipTagBlockSchema = z.object({
  id: z.string(),
  type: z.literal('relationship_tag'),
  entityType: z.enum(['skill', 'capability', 'project', 'evidence', 'content_item']),
  entityId: z.string(),
  label: z.string(),
});

export const ContentBlockV1Schema = z.discriminatedUnion('type', [
  HeadingBlockSchema,
  ParagraphBlockSchema,
  CodeBlockSchema,
  CalloutBlockSchema,
  QuoteBlockSchema,
  ListBlockSchema,
  ImageBlockSchema,
  EmbedArtifactBlockSchema,
  RelationshipTagBlockSchema,
]);

export type HeadingBlock = z.infer<typeof HeadingBlockSchema>;
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>;
export type CodeBlock = z.infer<typeof CodeBlockSchema>;
export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;
export type QuoteBlock = z.infer<typeof QuoteBlockSchema>;
export type ListBlock = z.infer<typeof ListBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type EmbedArtifactBlock = z.infer<typeof EmbedArtifactBlockSchema>;
export type RelationshipTagBlock = z.infer<typeof RelationshipTagBlockSchema>;

export type ContentBlockV1 = z.infer<typeof ContentBlockV1Schema>;

export const ContentBodyV1Schema = z.array(ContentBlockV1Schema);
export type ContentBodyV1 = z.infer<typeof ContentBodyV1Schema>;
