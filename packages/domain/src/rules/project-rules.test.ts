import { describe, it, expect } from 'vitest';
import {
  classifyAndValidateUrl,
  validateProjectWording,
  validateAdrSupersession,
  validateProjectRelationship,
  convertMarkdownToJsonBlocks,
  evaluateEditorialWording,
  sanitizeEngineeringTextWithMetadata,
  validateProjectCycle,
  validateVersionCycle,
  getPublicProjectProjection,
} from './project-rules.js';
import type { ProjectEntity, ProjectContributionEntity } from '../entities/index.js';

describe('Milestone M5 — Project Rules & URL Policy Tests', () => {
  it('1. classifyAndValidateUrl accepts valid public https URLs', () => {
    const res = classifyAndValidateUrl(
      'https://github.com/usmanalii/monorepo',
      'public_repository',
    );
    expect(res.valid).toBe(true);
    expect(res.classification).toBe('public_repository');
  });

  it('2. classifyAndValidateUrl rejects http and non-https schemes for public URLs', () => {
    const res = classifyAndValidateUrl('http://github.com/usmanalii/monorepo', 'public_repository');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('https: protocol');
  });

  it('3. classifyAndValidateUrl rejects credentials in URLs', () => {
    const res = classifyAndValidateUrl(
      'https://admin:secret@github.com/usmanalii/monorepo',
      'public_repository',
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Credentials');
  });

  it('4. classifyAndValidateUrl rejects localhost, private IPs, decimal/hex/octal encodings, IPv6 loopback, and control chars', () => {
    expect(classifyAndValidateUrl('https://localhost:8080/demo', 'public_deployment').valid).toBe(
      false,
    );
    expect(classifyAndValidateUrl('https://192.168.1.1/demo', 'public_deployment').valid).toBe(
      false,
    );
    expect(classifyAndValidateUrl('https://10.0.0.5/demo', 'public_deployment').valid).toBe(false);

    // Gate 5 hardened encodings
    expect(classifyAndValidateUrl('https://2130706433/demo', 'public_deployment').valid).toBe(
      false,
    ); // Decimal 127.0.0.1
    expect(classifyAndValidateUrl('https://0x7f000001/demo', 'public_deployment').valid).toBe(
      false,
    ); // Hex 127.0.0.1
    expect(classifyAndValidateUrl('https://0177.0.0.1/demo', 'public_deployment').valid).toBe(
      false,
    ); // Octal 127.0.0.1
    expect(classifyAndValidateUrl('https://127.1/demo', 'public_deployment').valid).toBe(false); // Shortened 127.0.0.1
    expect(classifyAndValidateUrl('https://[::1]/demo', 'public_deployment').valid).toBe(false); // IPv6 loopback
    expect(
      classifyAndValidateUrl('https://[::ffff:127.0.0.1]/demo', 'public_deployment').valid,
    ).toBe(false); // IPv4-mapped IPv6
    expect(classifyAndValidateUrl('https://example.com\r\n/demo', 'public_deployment').valid).toBe(
      false,
    ); // Control chars
  });

  it('5. classifyAndValidateUrl rejects javascript: and data: schemes', () => {
    const res1 = classifyAndValidateUrl('javascript:alert(1)', 'public_deployment');
    expect(res1.valid).toBe(false);
    expect(res1.reason).toContain('Unsafe URL scheme');

    const res2 = classifyAndValidateUrl(
      'data:text/html,<script>alert(1)</script>',
      'public_deployment',
    );
    expect(res2.valid).toBe(false);
  });

  it('6. validateProjectWording enforces title bounds and rejects percentage scores or XSS', () => {
    expect(validateProjectWording('Secure Monorepo', 'Architecture summary').valid).toBe(true);
    expect(validateProjectWording('', 'Summary').valid).toBe(false);
    expect(validateProjectWording('Project', '100% test coverage expert').valid).toBe(false);
    expect(validateProjectWording('Project', '<script>alert(1)</script>').valid).toBe(false);
  });

  it('7. validateAdrSupersession prevents self-supersession and supersession cycles', () => {
    expect(validateAdrSupersession([], 'adr-1', 'adr-1').valid).toBe(false);

    const existing = [
      { id: 'adr-1', supersededBy: 'adr-2' },
      { id: 'adr-2', supersededBy: 'adr-3' },
    ];
    expect(validateAdrSupersession(existing, 'adr-3', 'adr-1').valid).toBe(false);
  });

  it('8. validateProjectRelationship enforces non-empty IDs, self-link prevention, and relevance scale 1-5', () => {
    expect(
      validateProjectRelationship({
        sourceId: 'proj-1',
        targetId: 'proj-2',
        relationshipType: 'related',
        relevance: 3,
      }).valid,
    ).toBe(true);
    expect(
      validateProjectRelationship({
        sourceId: 'proj-1',
        targetId: 'proj-1',
        relationshipType: 'related',
        relevance: 3,
      }).valid,
    ).toBe(false);
  });

  it('9. Gate 1: convertMarkdownToJsonBlocks converts Markdown text into canonical JSON blocks', () => {
    const md =
      '# Architecture Overview\n\nThis is a paragraph.\n\n- Point 1\n- Point 2\n\n```ts\nconst x = 1;\n```';
    const blocks = convertMarkdownToJsonBlocks(md);
    expect(blocks.length).toBe(4);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[2].type).toBe('list');
    expect(blocks[3].type).toBe('code_block');
  });

  it('10. Gate 6: evaluateEditorialWording flags unapproved claims and promotional superlatives', () => {
    const warnings = evaluateEditorialWording({
      title: 'World-class Architecture',
      shortSummary: 'I led the team and increased throughput by 100x',
      ownerApproved: false,
      supportingEvidenceIds: [],
    });

    expect(warnings.length).toBeGreaterThanOrEqual(3);
    expect(warnings.some((w) => w.code === 'PROMOTIONAL_CLAIM')).toBe(true);
    expect(warnings.some((w) => w.code === 'AUTHORSHIP_CLAIM')).toBe(true);
    expect(warnings.some((w) => w.code === 'UNSUPPORTED_METRIC_CLAIM')).toBe(true);
  });

  it('11. Gate 7: sanitizeEngineeringTextWithMetadata redacts secrets and produces redaction metadata', () => {
    const secretText = 'API key sk_live_1234567890abcdef and Bearer 1234567890abcdef12345';
    const { sanitizedText, redactionMetadata } = sanitizeEngineeringTextWithMetadata(secretText);

    expect(sanitizedText).toContain('[REDACTED_API_KEY]');
    expect(sanitizedText).toContain('[REDACTED_BEARER_TOKEN]');
    expect(redactionMetadata.length).toBe(2);
  });

  it('12. Gate 3: validateProjectCycle and validateVersionCycle detect cycles', () => {
    const rels = [{ sourceId: 'p2', targetId: 'p1', relationshipType: 'depends_on' }];
    expect(validateProjectCycle(rels, 'p1', 'p2').valid).toBe(false);

    const vers = [{ id: 'v2', previousVersionId: 'v1' }];
    expect(validateVersionCycle(vers, 'v1', 'v2').valid).toBe(false);
  });

  it('13. Gate 4: getPublicProjectProjection filters ineligible children and ensures mode consistency', () => {
    const proj = {
      id: 'proj-1',
      publicationState: 'published',
      visibility: 'public',
      scheduledFor: null,
      embargoUntil: null,
      deletedAt: null,
    } as unknown as ProjectEntity;

    const contribs = [
      { id: 'c1', visibility: 'public', ownerApproval: true, deletedAt: null },
      { id: 'c2', visibility: 'private', ownerApproval: true, deletedAt: null },
    ] as unknown as readonly ProjectContributionEntity[];

    const result = getPublicProjectProjection({
      project: proj,
      contributions: contribs,
      experiments: [],
      adrs: [],
      debuggingLessons: [],
      deployments: [],
      versions: [],
      relationships: [],
    });

    expect(result).not.toBeNull();
    expect(result!.contributions.length).toBe(1);
    expect(result!.contributions[0].id).toBe('c1');
  });
});
