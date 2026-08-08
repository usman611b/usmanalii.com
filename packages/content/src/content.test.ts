import { describe, test, expect } from 'vitest';
import {
  ContentBlockV1Schema,
  compileJsonBlocksToMarkdown,
  validateContentForPublication,
  sanitizeContentText,
  validateStateTransition,
  type ContentBlockV1,
  type ContentItemMetadata,
} from './index.js';

describe('packages/content Unit & Security Tests', () => {
  test('Block Schema: validates allowed blocks and rejects unsafe URLs', () => {
    const validHeading: ContentBlockV1 = {
      id: 'b1',
      type: 'heading',
      level: 2,
      text: 'Architectural Analysis',
    };
    expect(ContentBlockV1Schema.safeParse(validHeading).success).toBe(true);

    const unsafeImage = {
      id: 'b2',
      type: 'image',
      url: 'javascript:alert(1)',
      alt: 'Attack vector',
    };
    const result = ContentBlockV1Schema.safeParse(unsafeImage);
    expect(result.success).toBe(false);
  });

  test('Markdown Export: compiles canonical JSON blocks into GFM with YAML frontmatter', () => {
    const item: ContentItemMetadata = {
      id: 'item-100',
      title: 'Monorepo Security Design',
      slug: 'monorepo-security-design',
      contentType: 'journal',
      summary: 'Deep dive into security architecture.',
      occurredAt: '2026-08-08T00:00:00Z',
      publishedAt: '2026-08-08T12:00:00Z',
      visibility: 'public',
      state: 'published',
      versionNo: 1,
    };

    const blocks: ContentBlockV1[] = [
      { id: 'b1', type: 'heading', level: 1, text: 'Overview' },
      { id: 'b2', type: 'paragraph', text: 'This system uses WebCrypto RS256.' },
      { id: 'b3', type: 'code_block', code: 'const token = verify();', language: 'typescript' },
      { id: 'b4', type: 'callout', calloutType: 'note', title: 'Security', text: 'Fail-closed active.' },
    ];

    const markdown = compileJsonBlocksToMarkdown(item, blocks);
    expect(markdown).toContain('title: "Monorepo Security Design"');
    expect(markdown).toContain('# Overview');
    expect(markdown).toContain('```typescript\nconst token = verify();\n```');
    expect(markdown).toContain('> [!NOTE] Security');
  });

  test('Publication Validation: checks all 7 gates', () => {
    const validContext = {
      id: 'c1',
      title: 'Valid Journal',
      slug: 'valid-journal',
      summary: 'Summary of work',
      occurredAt: '2026-08-08T00:00:00Z',
      visibility: 'public' as const,
      blocks: [
        { id: 'b1', type: 'paragraph' as const, text: 'Valid body text.' },
        { id: 'b2', type: 'image' as const, url: 'https://usmanalii.com/img.png', alt: 'Valid diagram' },
      ],
      linkedEntities: [
        { id: 's1', type: 'skill' as const, visibility: 'public' as const, exists: true },
      ],
    };

    const validResult = validateContentForPublication(validContext);
    expect(validResult.valid).toBe(true);
    expect(validResult.reasons).toEqual([]);

    // Test Gate 4 Private dependency conflict & Gate 7 missing image alt
    const invalidContext = {
      ...validContext,
      blocks: [
        { id: 'b2', type: 'image' as const, url: 'https://usmanalii.com/img.png', alt: '' },
      ],
      linkedEntities: [
        { id: 's2', type: 'skill' as const, visibility: 'private' as const, exists: true },
      ],
    };

    const invalidResult = validateContentForPublication(invalidContext);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reasons.some((r) => r.includes('Private dependency conflict'))).toBe(true);
    expect(invalidResult.reasons.some((r) => r.includes('missing alternative text'))).toBe(true);
  });

  test('Sanitizer: strips unsafe script tags and javascript: links', () => {
    const payload = '<script>alert("xss")</script>Hello <iframe src="evil.com"></iframe> World javascript:void(0)';
    const clean = sanitizeContentText(payload);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<iframe>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Hello  World void(0)');
  });

  test('State Machine: validates allowed transitions', () => {
    expect(validateStateTransition('draft', 'review').valid).toBe(true);
    expect(validateStateTransition('review', 'approved').valid).toBe(true);
    expect(validateStateTransition('approved', 'published').valid).toBe(true);
    expect(validateStateTransition('draft', 'published').valid).toBe(false);
  });
});
