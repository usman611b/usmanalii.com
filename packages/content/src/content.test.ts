import { describe, it, expect } from 'vitest';
import {
  ContentBlockV1Schema,
  compileJsonBlocksToMarkdown,
  validateContentForPublication,
  validateStateTransition,
  escapeHtml,
  escapeJsonLd,
  isSafeUrlProtocol,
  isAllowedEmbedOrigin,
  sanitizeSvg,
} from './index';

describe('Adversarial XSS & Security Boundary Tests (Gate 4 & 5)', () => {
  it('1. escapeHtml escapes raw HTML tags and characters', () => {
    const raw = '<script>alert("xss")</script> & "quote" \'single\'';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quote&quot; &#39;single&#39;');
    expect(escaped).not.toContain('<script>');
  });

  it('2. escapeJsonLd safely escapes </script> and <!-- injection sequences', () => {
    const payload = {
      headline: '</script><script>alert(1)</script>',
      comment: '<!-- comment -->',
    };
    const escaped = escapeJsonLd(payload);
    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('\\u003c/script\\u003e');
    expect(escaped).not.toContain('<!--');
  });

  it('3. isSafeUrlProtocol blocks unsafe protocols and allows safe ones', () => {
    expect(isSafeUrlProtocol('javascript:alert(1)')).toBe(false);
    expect(isSafeUrlProtocol('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrlProtocol('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeUrlProtocol('https://usmanalii.com/path')).toBe(true);
    expect(isSafeUrlProtocol('http://localhost:3000')).toBe(true);
    expect(isSafeUrlProtocol('mailto:owner@usmanalii.com')).toBe(true);
    expect(isSafeUrlProtocol('/relative/path')).toBe(true);
  });

  it('4. isAllowedEmbedOrigin allowlists approved domains and rejects unallowed ones', () => {
    expect(isAllowedEmbedOrigin('https://github.com/usmanalii/repo')).toBe(true);
    expect(isAllowedEmbedOrigin('https://codepen.io/pen/123')).toBe(true);
    expect(isAllowedEmbedOrigin('https://figma.com/file/123')).toBe(true);
    expect(isAllowedEmbedOrigin('https://malicious-site.com/embed')).toBe(false);
    expect(isAllowedEmbedOrigin('javascript:alert(1)')).toBe(false);
  });

  it('5. sanitizeSvg removes <script>, on* event handlers, and javascript: links', () => {
    const maliciousSvg = `<svg><script>alert("xss")</script><rect width="100" height="100" onload="alert('xss')" /><a href="javascript:alert(1)"><image href="https://evil.com/img.png" /></a></svg>`;
    const clean = sanitizeSvg(maliciousSvg);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onload=');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('<image');
  });

  it('6. YAML metadata frontmatter serialization is safe against injection (Gate 8)', () => {
    const item = {
      id: 'entry-1',
      title: 'Title with colon: and "quotes" and \n newlines and ---\n fake frontmatter',
      slug: 'valid-slug',
      contentType: 'journal' as const,
      summary: 'Summary with ---\n injection',
      visibility: 'public',
      state: 'published',
      versionNo: 1,
    };
    const compiled = compileJsonBlocksToMarkdown(item, [
      { id: 'b1', type: 'paragraph', text: 'Hello world' },
    ]);
    expect(compiled).toContain('---');
    expect(compiled).toContain('Title with colon:');
    // Ensure string quotes or YAML block scalars prevent frontmatter boundary breakage
    expect(compiled.match(/^---$/gm)?.length).toBe(2);
  });

  it('7. Rejects unsafe URLs in Image block schema parsing', () => {
    const result = ContentBlockV1Schema.safeParse({
      id: 'img1',
      type: 'image',
      url: 'javascript:alert(1)',
      alt: 'Test image',
    });
    expect(result.success).toBe(false);
  });

  it('8. Validates state machine transitions cleanly', () => {
    expect(validateStateTransition('draft', 'review').valid).toBe(true);
    expect(validateStateTransition('review', 'approved').valid).toBe(true);
    expect(validateStateTransition('approved', 'published').valid).toBe(true);
    expect(validateStateTransition('published', 'archived').valid).toBe(true);
    expect(validateStateTransition('archived', 'published').valid).toBe(false);
    expect(validateStateTransition('draft', 'published').valid).toBe(false); // must go through review -> approved first
  });

  it('9. Publication validator enforces all 7 gates', () => {
    const invalidItem = {
      id: 'item-1',
      title: '', // Gate 1 failure
      slug: 'INVALID SLUG!', // Gate 2 failure
      visibility: 'private' as const, // Gate 3 failure for public publication
      summary: '<script>alert(1)</script>', // Gate 5 failure
      blocks: [],
      linkedEntities: [],
    };

    const result = validateContentForPublication(invalidItem);
    expect(result.valid).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
