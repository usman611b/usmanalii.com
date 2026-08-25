import type { ContentBlockV1 } from './schema.js';
import { ContentBodyV1Schema } from './schema.js';

export interface LinkedEntityInfo {
  id: string;
  type: 'skill' | 'capability' | 'project' | 'evidence' | 'content_item';
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
  exists: boolean;
}

export interface PublicationValidationContext {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  occurredAt?: string | null;
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
  blocks: ContentBlockV1[];
  linkedEntities: LinkedEntityInfo[];
}

export interface PublicationValidationResult {
  valid: boolean;
  reasons: string[];
}

/**
 * Validates a content item against all 7 publication validation gates.
 * Requirement 12 & Security Threat Model §4.
 */
export function validateContentForPublication(
  ctx: PublicationValidationContext,
): PublicationValidationResult {
  const reasons: string[] = [];

  // Gate 1: Required metadata
  if (!ctx.title || ctx.title.trim().length === 0) {
    reasons.push('Title is required for publication.');
  }
  if (!ctx.summary || ctx.summary.trim().length === 0) {
    reasons.push('Summary is required for publication.');
  }
  if (!ctx.occurredAt || isNaN(new Date(ctx.occurredAt).getTime())) {
    reasons.push('Valid occurred_at date is required for publication.');
  }

  // Gate 2: Slug validity
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!ctx.slug || !slugRegex.test(ctx.slug)) {
    reasons.push(
      'Slug must be non-empty and contain lower-case alphanumeric characters and hyphens only.',
    );
  }

  // Gate 3: Effective visibility
  if (ctx.visibility !== 'public' && ctx.visibility !== 'unlisted') {
    reasons.push(
      `Effective visibility must be "public" or "unlisted" to publish (current: "${ctx.visibility}").`,
    );
  }

  // Gate 4 & 6: Private-dependency conflicts & Broken references
  for (const entity of ctx.linkedEntities) {
    if (!entity.exists) {
      reasons.push(`Broken reference: linked ${entity.type} "${entity.id}" does not exist.`);
      continue;
    }
    if (ctx.visibility === 'public' && entity.visibility !== 'public') {
      reasons.push(
        `Private dependency conflict: public content references ${entity.visibility} ${entity.type} "${entity.id}".`,
      );
    } else if (ctx.visibility === 'unlisted' && entity.visibility === 'private') {
      reasons.push(
        `Private dependency conflict: unlisted content references private ${entity.type} "${entity.id}".`,
      );
    }
  }

  // Gate 5: Schema validation & Unsafe content check
  const parseResult = ContentBodyV1Schema.safeParse(ctx.blocks);
  if (!parseResult.success) {
    reasons.push(`Invalid JSON block structure: ${parseResult.error.message}`);
  }

  for (const block of ctx.blocks) {
    // Gate 7: Image alt text
    if (block.type === 'image') {
      if (!block.alt || block.alt.trim().length === 0) {
        reasons.push(`Image block "${block.id}" is missing alternative text.`);
      }
      if (block.url.toLowerCase().startsWith('javascript:')) {
        reasons.push(`Image block "${block.id}" contains unsafe javascript: URL.`);
      }
    }

    // Unsafe script/html tag check across text fields
    const textToCheck = extractTextFromBlock(block);
    if (
      /<script\b/i.test(textToCheck) ||
      /<iframe\b/i.test(textToCheck) ||
      /\bon\w+\s*=/i.test(textToCheck)
    ) {
      reasons.push(`Unsafe executable HTML or script payload detected in block "${block.id}".`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/** Extracts all string text content from a block for sanitization scanning. */
function extractTextFromBlock(block: ContentBlockV1): string {
  switch (block.type) {
    case 'heading':
      return block.text;
    case 'paragraph':
      return block.text;
    case 'code_block':
      return `${block.code} ${block.caption || ''}`;
    case 'callout':
      return `${block.title || ''} ${block.text}`;
    case 'quote':
      return `${block.text} ${block.cite || ''}`;
    case 'list':
      return block.items.join(' ');
    case 'image':
      return `${block.url} ${block.alt} ${block.caption || ''}`;
    case 'architecture_diagram':
      return `${block.title} ${block.nodes.join(' ')} ${block.text || ''}`;
    case 'metrics':
      return `${block.title} ${block.items.join(' ')}`;
    case 'embed_artifact':
      return `${block.artifactId} ${block.caption || ''}`;
    case 'relationship_tag':
      return `${block.label} ${block.entityId}`;
    default:
      return '';
  }
}

/**
 * Sanitizes input text string by stripping unsafe HTML tags and script elements.
 */
export function sanitizeContentText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '');
}
