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
  parseCanonicalProjectBlocks,
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
      ownerId: 'private-owner',
      provenance: 'private-provenance',
      publicationState: 'published',
      visibility: 'public',
      scheduledFor: null,
      embargoUntil: null,
      deletedAt: null,
      repositoryReferences: ['https://github.com/example/project', 'https://localhost/private'],
      liveDemoReferences: [],
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
    expect(result!.project.ownerId).toBeUndefined();
    expect(result!.project.provenance).toBeUndefined();
    expect(result!.project.repositoryReferences).toEqual(['https://github.com/example/project']);
  });

  it('14. ADR-005 canonical JSON rejects malformed, unsupported versions and unsupported blocks', () => {
    expect(parseCanonicalProjectBlocks('[{"type":"paragraph","text":"safe"}]')).toHaveLength(1);
    expect(() => parseCanonicalProjectBlocks('not-json')).toThrow('MALFORMED_CANONICAL_BODY');
    expect(() => parseCanonicalProjectBlocks('[]', 2)).toThrow('UNSUPPORTED_BODY_SCHEMA_VERSION');
    expect(() => parseCanonicalProjectBlocks('[{"type":"script"}]')).toThrow(
      'UNSUPPORTED_BLOCK_TYPE',
    );
  });

  it.each([
    ['link-local IPv4', 'https://169.254.1.2/a'],
    ['IPv6 loopback', 'https://[::1]/a'],
    ['IPv6 unique-local', 'https://[fc12::1]/a'],
    ['IPv6 link-local', 'https://[fe9a::1]/a'],
    ['IPv4-mapped IPv6', 'https://[::ffff:127.0.0.1]/a'],
    ['decimal IPv4', 'https://2130706433/a'],
    ['hex IPv4', 'https://0x7f000001/a'],
    ['encoded credentials', 'https://user%3Apass@example.com/a'],
    ['control character', 'https://example.com\n/a'],
    ['scheme-relative URL', '//example.com/a'],
    ['nonstandard port', 'https://example.com:8443/a'],
    ['localhost subdomain', 'https://api.localhost/a'],
  ])('15. public-link policy rejects %s', (_name, url) => {
    expect(classifyAndValidateUrl(url, 'public_deployment').valid).toBe(false);
  });

  it('16. public-link policy normalizes trailing dots, Unicode and punycode without fetching', () => {
    const dotted = classifyAndValidateUrl('https://example.com./a', 'documentation');
    expect(dotted.valid).toBe(true);
    expect(dotted.normalizedUrl).toBeDefined();
    const unicode = classifyAndValidateUrl('https://bücher.example/a', 'documentation');
    const punycode = classifyAndValidateUrl('https://xn--bcher-kva.example/a', 'documentation');
    expect(unicode.valid).toBe(true);
    expect(unicode.normalizedUrl).toBe(punycode.normalizedUrl);
  });

  it('17. every public child category uses identical privacy eligibility in all modes', () => {
    const project = {
      id: 'p',
      publicationState: 'published',
      visibility: 'public',
      scheduledFor: null,
      embargoUntil: null,
      deletedAt: null,
    } as unknown as ProjectEntity;
    const categories = [
      'evidence',
      'artifacts',
      'skills',
      'capabilities',
      'journalLinks',
      'relatedProjects',
    ] as const;
    for (const mode of ['general', 'recruiter', 'deep_dive'] as const) {
      const inputs = Object.fromEntries(
        categories.map((key) => [
          key,
          [
            { id: `${key}-public`, visibility: 'public', state: 'published' },
            {
              id: `${key}-private`,
              visibility: 'private',
              state: 'published',
              privateIdentifier: 'secret',
            },
          ],
        ]),
      );
      const result = getPublicProjectProjection({
        project,
        contributions: [],
        experiments: [],
        adrs: [],
        debuggingLessons: [],
        deployments: [],
        versions: [],
        relationships: [],
        mode,
        ...inputs,
      });
      for (const key of categories) {
        expect(result?.[key]).toHaveLength(1);
        expect(JSON.stringify(result?.[key])).not.toContain('secret');
      }
    }
  });

  it('18. centralized projection prevents hidden counts, draft revisions, private URLs, and approval-removal leaks in every mode', () => {
    const project = {
      id: 'project-public',
      publicationState: 'published',
      visibility: 'public',
      scheduledFor: null,
      embargoUntil: null,
      deletedAt: null,
      repositoryReferences: ['https://github.com/example/public', 'https://localhost/private'],
      liveDemoReferences: [],
    } as unknown as ProjectEntity;
    const build = (mode: 'general' | 'recruiter' | 'deep_dive') =>
      getPublicProjectProjection({
        project,
        mode,
        contributions: [
          {
            id: 'contribution-public',
            ownerId: 'private-owner-id',
            provenance: 'private-provenance',
            visibility: 'public',
            ownerApproval: true,
            deletedAt: null,
          },
          {
            id: 'contribution-hidden',
            visibility: 'private',
            ownerApproval: true,
            deletedAt: null,
          },
        ] as never,
        experiments: [
          { id: 'experiment-public', visibility: 'public', state: 'published', deletedAt: null },
          { id: 'experiment-hidden', visibility: 'private', state: 'published', deletedAt: null },
        ] as never,
        adrs: [
          { id: 'adr-public', visibility: 'public', state: 'published', deletedAt: null },
          { id: 'adr-hidden', visibility: 'private', state: 'published', deletedAt: null },
        ] as never,
        debuggingLessons: [
          { id: 'debug-public', visibility: 'public', state: 'published', deletedAt: null },
          { id: 'debug-hidden', visibility: 'private', state: 'published', deletedAt: null },
        ] as never,
        deployments: [
          {
            id: 'deployment-public',
            visibility: 'public',
            publicationState: 'published',
            deletedAt: null,
            deploymentUrl: 'https://example.com/release',
            environment: 'production',
          },
          {
            id: 'deployment-hidden',
            visibility: 'private',
            publicationState: 'published',
            deletedAt: null,
            deploymentUrl: 'https://private.example/release',
            environment: 'production',
          },
        ] as never,
        versions: [
          { id: 'version-public', visibility: 'public', state: 'published', deletedAt: null },
          { id: 'version-hidden', visibility: 'private', state: 'published', deletedAt: null },
        ] as never,
        relationships: [
          { id: 'relationship-public', approvalState: 'accepted', archivedAt: null },
          { id: 'relationship-hidden', approvalState: 'pending', archivedAt: null },
        ] as never,
        evidence: [
          { id: 'evidence-public', visibility: 'public', state: 'published' },
          { id: 'evidence-hidden', visibility: 'private', state: 'published' },
        ],
        artifacts: [
          { id: 'artifact-public', visibility: 'public', state: 'published' },
          { id: 'artifact-hidden', visibility: 'private', state: 'published' },
        ],
        skills: [
          { id: 'skill-public', visibility: 'public', state: 'published' },
          { id: 'skill-hidden', visibility: 'private', state: 'published' },
        ],
        capabilities: [
          { id: 'capability-public', visibility: 'public', state: 'published' },
          { id: 'capability-hidden', visibility: 'private', state: 'published' },
        ],
        journalLinks: [
          { id: 'journal-public', visibility: 'public', state: 'published' },
          { id: 'journal-hidden', visibility: 'private', state: 'published' },
        ],
        relatedProjects: [
          { id: 'related-public', visibility: 'public', state: 'published' },
          { id: 'related-hidden', visibility: 'private', state: 'published' },
        ],
        externalUrls: [
          {
            id: 'url-public',
            url: 'https://example.com/public',
            visibility: 'public',
            approvalState: 'approved',
          },
          {
            id: 'url-private',
            url: 'https://private.example/secret',
            visibility: 'private',
            approvalState: 'approved',
          },
          {
            id: 'url-revoked',
            url: 'https://example.com/revoked',
            visibility: 'public',
            approvalState: 'pending',
          },
        ],
      });
    const serialized = (['general', 'recruiter', 'deep_dive'] as const).map((mode) =>
      JSON.stringify(build(mode)),
    );
    expect(new Set(serialized).size).toBe(1);
    for (const output of serialized) {
      expect(output).not.toMatch(/hidden|private\.example|revoked/);
      expect(output).not.toContain('count');
      expect(output).not.toContain('revisions');
      expect(output).not.toMatch(/private-owner-id|private-provenance/);
      expect(output).toContain('url-public');
    }
  });
});
