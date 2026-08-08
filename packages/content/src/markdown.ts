import type { ContentBlockV1 } from './schema.js';

export interface ContentItemMetadata {
  id: string;
  title: string;
  slug: string;
  contentType: 'note' | 'journal' | 'deep_dive' | 'retrospective';
  summary?: string | null;
  occurredAt?: string | null;
  publishedAt?: string | null;
  visibility: string;
  state: string;
  versionNo: number;
}

/**
 * Compiles a content item metadata + canonical JSON blocks array (v1)
 * into portable GitHub-Flavored Markdown with YAML frontmatter.
 * ADR-005 & Requirement 9.
 */
export function compileJsonBlocksToMarkdown(
  item: ContentItemMetadata,
  blocks: ContentBlockV1[],
): string {
  const frontmatterLines: string[] = [
    '---',
    `id: ${JSON.stringify(item.id)}`,
    `title: ${JSON.stringify(item.title)}`,
    `slug: ${JSON.stringify(item.slug)}`,
    `type: ${JSON.stringify(item.contentType)}`,
    `state: ${JSON.stringify(item.state)}`,
    `visibility: ${JSON.stringify(item.visibility)}`,
    `version: ${item.versionNo}`,
  ];

  if (item.summary) {
    frontmatterLines.push(`summary: ${JSON.stringify(item.summary)}`);
  }
  if (item.occurredAt) {
    frontmatterLines.push(`occurred_at: ${JSON.stringify(item.occurredAt)}`);
  }
  if (item.publishedAt) {
    frontmatterLines.push(`published_at: ${JSON.stringify(item.publishedAt)}`);
  }

  frontmatterLines.push('---', '');

  const markdownBlocks: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const hashes = '#'.repeat(block.level);
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
        markdownBlocks.push(`![${block.alt}](${block.url})${caption}`);
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

  return frontmatterLines.join('\n') + markdownBlocks.join('\n\n') + '\n';
}
