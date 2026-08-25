import { describe, it, expect } from 'vitest';
import {
  ContentBlockV1Schema,
  compileJsonBlocksToMarkdown,
  validateContentForPublication,
  validateStateTransition,
  escapeHtml,
  escapeJsonLd,
  isSafeLinkUrl,
  isSafeImageUrl,
  isSafeEmbedUrl,
  isSafeArtifactUrl,
  isAllowedEmbedOrigin,
  sanitizeSvg,
} from './index';

describe('Adversarial XSS & Security Boundary Tests (Gate 4 & 5)', () => {
  it('1. escapeHtml escapes raw HTML tags and characters', () => {
    const raw = '<script>alert("xss")</script> & "quote" \'single\'';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quote&quot; &#39;single&#39;',
    );
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

  it('3. isSafeLinkUrl vs isSafeImageUrl/Embed/Artifact (Requirement 6)', () => {
    // Ordinary links allow mailto: and tel:
    expect(isSafeLinkUrl('mailto:owner@usmanalii.com')).toBe(true);
    expect(isSafeLinkUrl('tel:+1234567890')).toBe(true);
    expect(isSafeLinkUrl('https://usmanalii.com/path')).toBe(true);

    // Images, embeds, and artifacts MUST NOT inherit mailto: or tel:!
    expect(isSafeImageUrl('mailto:owner@usmanalii.com')).toBe(false);
    expect(isSafeImageUrl('tel:+1234567890')).toBe(false);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('https://usmanalii.com/img.png')).toBe(true);
    expect(isSafeImageUrl('/assets/img.png')).toBe(true);

    expect(isSafeEmbedUrl('mailto:owner@usmanalii.com')).toBe(false);
    expect(isSafeEmbedUrl('tel:+1234567890')).toBe(false);
    expect(isSafeEmbedUrl('https://github.com')).toBe(true);

    expect(isSafeArtifactUrl('mailto:owner@usmanalii.com')).toBe(false);
    expect(isSafeArtifactUrl('tel:+1234567890')).toBe(false);
    expect(isSafeArtifactUrl('https://usmanalii.com/artifact.pdf')).toBe(true);
  });

  it('4. isAllowedEmbedOrigin allowlists approved domains and rejects unallowed ones', () => {
    expect(isAllowedEmbedOrigin('https://github.com/usmanalii/repo')).toBe(true);
    expect(isAllowedEmbedOrigin('https://codepen.io/pen/123')).toBe(true);
    expect(isAllowedEmbedOrigin('https://figma.com/file/123')).toBe(true);
    expect(isAllowedEmbedOrigin('https://malicious-site.com/embed')).toBe(false);
    expect(isAllowedEmbedOrigin('javascript:alert(1)')).toBe(false);
  });

  it('5. sanitizeSvg removes <script>, foreignObject, animate, set, on* handlers, data/javascript URLs, and xmlns:xlink payloads (Requirement 5)', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <script>alert("xss1")</script>
      <foreignObject><iframe src="javascript:alert(2)"></iframe></foreignObject>
      <animate attributeName="href" values="javascript:alert(3)" />
      <set attributeName="onload" to="alert(4)" />
      <rect width="100" height="100" onload="alert('xss5')" onerror="alert('xss6')" style="background: url(javascript:alert(7))" />
      <a href="javascript:alert(8)"><image href="data:text/html,<script>alert(9)</script>" /></a>
    </svg>`;

    const clean = sanitizeSvg(maliciousSvg);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<foreignObject>');
    expect(clean).not.toContain('<animate');
    expect(clean).not.toContain('<set');
    expect(clean).not.toContain('onload=');
    expect(clean).not.toContain('onerror=');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('data:');
    expect(clean).not.toContain('xmlns:xlink');
    expect(clean).not.toContain('<image');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('url(');
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

  it('8a. accepts the rich journal blocks produced by the editor', () => {
    expect(
      ContentBlockV1Schema.safeParse({
        id: 'architecture-1',
        type: 'architecture_diagram',
        title: 'Training flow',
        nodes: ['Input', 'Forward pass', 'Loss', 'Backward pass'],
        text: 'A compact view of the learning loop.',
      }).success,
    ).toBe(true);
    expect(
      ContentBlockV1Schema.safeParse({
        id: 'metrics-1',
        type: 'metrics',
        title: 'Repository evidence',
        items: ['9 | Sessions | Day 18'],
      }).success,
    ).toBe(true);
    expect(
      ContentBlockV1Schema.safeParse({
        id: 'list-1',
        type: 'list',
        style: 'unordered',
        items: ['One', 'Two'],
      }).success,
    ).toBe(true);
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
