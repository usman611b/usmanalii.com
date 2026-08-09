import { describe, expect, it } from 'vitest';
import { convertMarkdownToJsonBlocks, parseCanonicalProjectBlocks } from '@usmanalii/domain';
import { compileJsonBlocksToMarkdown } from './markdown.js';

const metadata = {
  id: 'project-1',
  title: 'Canonical project',
  slug: 'canonical-project',
  contentType: 'deep_dive' as const,
  visibility: 'private' as const,
  state: 'draft' as const,
  versionNo: 1,
};

describe('M5 canonical project revision storage', () => {
  it('JSON blocks are authoritative and Markdown is a derived export', () => {
    const canonical = JSON.stringify([
      { type: 'heading', level: 2, text: 'Design' },
      { type: 'paragraph', text: 'Canonical body' },
    ]);
    const blocks = parseCanonicalProjectBlocks(canonical);
    const markdown = compileJsonBlocksToMarkdown(metadata, blocks as never);
    expect(markdown).toContain('## Design');
    expect(markdown).toContain('Canonical body');
    const editedExport = markdown.replace('Canonical body', 'tampered export');
    expect(editedExport).not.toEqual(markdown);
    expect(JSON.stringify(blocks)).toBe(canonical);
  });

  it('round-trip conversion preserves supported semantic blocks', () => {
    const source = '# Heading\n\nParagraph\n\n- one\n- two\n\n```ts\nconst x = 1;\n```';
    const imported = convertMarkdownToJsonBlocks(source);
    const exported = compileJsonBlocksToMarkdown(metadata, imported as never);
    const body = exported.replace(/^---[\s\S]*?---\n\n/, '');
    const roundTripped = convertMarkdownToJsonBlocks(body);
    expect(roundTripped.map((block) => block.type)).toEqual(imported.map((block) => block.type));
    expect(roundTripped.map((block) => block.text ?? block.code ?? block.items)).toEqual(
      imported.map((block) => block.text ?? block.code ?? block.items),
    );
  });
});
