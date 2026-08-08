import YAML from 'yaml';
import type { ContentBlockV1 } from './schema.js';

export interface ContentItemMetadata {
  id: string;
  title: string;
  slug: string;
  contentType: 'note' | 'journal' | 'deep_dive' | 'retrospective';
  summary?: string | null | undefined;
  occurredAt?: string | null | undefined;
  publishedAt?: string | null | undefined;
  visibility: string;
  state: string;
  versionNo: number;
}

/**
 * Escapes HTML entities in untrusted text strings to prevent XSS.
 * Gate 4 requirement.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely stringifies JSON-LD objects, preventing </script> and <!-- injection.
 * Gate 4 requirement.
 */
export function escapeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Validates external URLs against approved protocols (https, http, mailto, tel).
 * Gate 4 requirement.
 */
export function isSafeUrlProtocol(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true; // relative safe
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  );
}

/**
 * Validates embed artifact URLs against allowed origins.
 * Gate 4 requirement.
 */
export function isAllowedEmbedOrigin(url: string): boolean {
  if (!isSafeUrlProtocol(url)) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowedHosts = [
      'github.com',
      'gist.github.com',
      'codepen.io',
      'figma.com',
      'www.figma.com',
      'youtube.com',
      'www.youtube.com',
      'vimeo.com',
      'player.vimeo.com',
    ];
    return allowedHosts.some((h) => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

/**
 * Sanitizes SVG content by removing <script> tags, inline event attributes (on*),
 * javascript: links, and external resource references.
 * Gate 4 requirement.
 */
export function sanitizeSvg(svg: string): string {
  if (!svg || typeof svg !== 'string') return '';
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, 'href="#"')
    .replace(/<image\b[^>]*>/gi, '');
}

/**
 * Compiles content item metadata + canonical JSON blocks array (v1)
 * into portable GitHub-Flavored Markdown with YAML frontmatter.
 * Uses YAML library for safe frontmatter serialization (ADR-005 & Gate 8).
 */
export function compileJsonBlocksToMarkdown(
  item: ContentItemMetadata,
  blocks: ContentBlockV1[],
): string {
  const metaObj: Record<string, unknown> = {
    id: item.id,
    title: item.title,
    slug: item.slug,
    type: item.contentType,
    state: item.state,
    visibility: item.visibility,
    version: item.versionNo,
  };

  if (item.summary !== undefined && item.summary !== null) {
    metaObj.summary = item.summary;
  }
  if (item.occurredAt !== undefined && item.occurredAt !== null) {
    metaObj.occurred_at = item.occurredAt;
  }
  if (item.publishedAt !== undefined && item.publishedAt !== null) {
    metaObj.published_at = item.publishedAt;
  }

  const yamlFrontmatter = YAML.stringify(metaObj).trim();
  const frontmatterStr = `---\n${yamlFrontmatter}\n---\n\n`;

  const markdownBlocks: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const hashes = '#'.repeat(Math.min(Math.max(block.level, 1), 6));
        markdownBlocks.push(`${hashes} ${block.text}`);
        break;
      }
      case 'paragraph': {
        markdownBlocks.push(block.text);
        break;
      }
      case 'code_block': {
        const lang = block.language || '';
        const caption = block.caption ? `\n*${block.caption}*` : '';
        markdownBlocks.push(`\`\`\`${lang}\n${block.code}\n\`\`\`${caption}`);
        break;
      }
      case 'callout': {
        const typeUpper = block.calloutType.toUpperCase();
        const title = block.title ? ` ${block.title}` : '';
        const lines = block.text.split('\n').map((l) => `> ${l}`).join('\n');
        markdownBlocks.push(`> [!${typeUpper}]${title}\n${lines}`);
        break;
      }
      case 'quote': {
        const cite = block.cite ? `\n> — *${block.cite}*` : '';
        const lines = block.text.split('\n').map((l) => `> ${l}`).join('\n');
        markdownBlocks.push(`${lines}${cite}`);
        break;
      }
      case 'list': {
        const listLines = block.items.map((itemStr, index) => {
          if (block.style === 'ordered') {
            return `${index + 1}. ${itemStr}`;
          }
          return `- ${itemStr}`;
        });
        markdownBlocks.push(listLines.join('\n'));
        break;
      }
      case 'image': {
        const caption = block.caption ? `\n*${block.caption}*` : '';
        const safeUrl = isSafeUrlProtocol(block.url) ? block.url : '#invalid-url';
        markdownBlocks.push(`![${block.alt}](${safeUrl})${caption}`);
        break;
      }
      case 'embed_artifact': {
        const caption = block.caption ? ` (${block.caption})` : '';
        markdownBlocks.push(`*[Embedded Artifact: ${block.artifactId}]*${caption}`);
        break;
      }
      case 'relationship_tag': {
        markdownBlocks.push(`\`@${block.entityType}:${block.label}\` (${block.entityId})`);
        break;
      }
    }
  }

  return frontmatterStr + markdownBlocks.join('\n\n') + '\n';
}
