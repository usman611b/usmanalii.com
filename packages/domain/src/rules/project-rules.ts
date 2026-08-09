export type ContentCalloutType = 'info' | 'warning' | 'tip' | 'note' | 'caution';

export interface ContentBlockV1 {
  id?: string | undefined;
  type: string;
  level?: (1 | 2 | 3 | 4) | undefined;
  text?: string | undefined;
  calloutType?: ContentCalloutType | undefined;
  title?: string | undefined;
  language?: string | undefined;
  code?: string | undefined;
  style?: ('bullet' | 'ordered') | undefined;
  items?: readonly string[] | undefined;
  [key: string]: unknown;
}

import type {
  ProjectEntity,
  ProjectContributionEntity,
  ExperimentEntity,
  ProjectAdrEntity,
  DebuggingLessonEntity,
  DeploymentEntity,
  ProjectVersionEntity,
  ProjectRelationshipEntity,
} from '../entities/index.js';

/**
 * Milestone M5 — Project Business Rules, Security Policies & Editorial Controls.
 */

export type UrlClassification =
  | 'public_repository'
  | 'public_deployment'
  | 'documentation'
  | 'artifact'
  | 'private_internal'
  | 'preview_staging'
  | 'administrative';

// ---------------------------------------------------------------------------
// Gate 1: Markdown to JSON Block Converter (ADR-005 Compliance)
// ---------------------------------------------------------------------------
export function convertMarkdownToJsonBlocks(markdown: string): ContentBlockV1[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const lines = markdown.split(/\r?\n/);
  const blocks: ContentBlockV1[] = [];
  let currentBlockType: 'paragraph' | 'code' | 'list' | 'quote' | null = null;
  let codeBuffer: string[] = [];
  let codeLang = 'text';
  let listBuffer: string[] = [];
  let listStyle: 'bullet' | 'ordered' = 'bullet';
  let quoteBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join('\n').trim();
      if (text) {
        // Image check inside paragraph
        const imgMatch = text.match(/^!\[(.*?)\]\((.*?)\)(?:\s*\*(.*?)\*)?$/);
        if (imgMatch) {
          blocks.push({
            id: `blk-${crypto.randomUUID()}`,
            type: 'image',
            alt: imgMatch[1] || 'Project illustration',
            url: imgMatch[2] || '#',
            caption: imgMatch[3] || undefined,
          });
        } else {
          blocks.push({
            id: `blk-${crypto.randomUUID()}`,
            type: 'paragraph',
            text,
          });
        }
      }
      paragraphBuffer = [];
    }
  };

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      blocks.push({
        id: `blk-${crypto.randomUUID()}`,
        type: 'code_block',
        language: codeLang || 'text',
        code: codeBuffer.join('\n'),
      });
      codeBuffer = [];
      codeLang = 'text';
    }
  };

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({
        id: `blk-${crypto.randomUUID()}`,
        type: 'list',
        style: listStyle,
        items: [...listBuffer],
      });
      listBuffer = [];
    }
  };

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      const full = quoteBuffer.join('\n');
      const calloutMatch = full.match(/^\[!([A-Z]+)\](?:\s*(.*))?\n([\s\S]*)$/);
      if (calloutMatch && calloutMatch[1] && calloutMatch[3]) {
        const typeLower = calloutMatch[1].toLowerCase();
        const validTypes: ContentCalloutType[] = ['info', 'warning', 'tip', 'note', 'caution'];
        blocks.push({
          id: `blk-${crypto.randomUUID()}`,
          type: 'callout',
          calloutType: validTypes.includes(typeLower as ContentCalloutType)
            ? (typeLower as ContentCalloutType)
            : 'note',
          title: calloutMatch[2] || undefined,
          text: calloutMatch[3].trim(),
        });
      } else {
        blocks.push({
          id: `blk-${crypto.randomUUID()}`,
          type: 'quote',
          text: full.trim(),
        });
      }
      quoteBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (currentBlockType === 'code') {
        flushCode();
        currentBlockType = null;
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        currentBlockType = 'code';
        codeLang = line.trim().slice(3).trim() || 'text';
      }
      continue;
    }

    if (currentBlockType === 'code') {
      codeBuffer.push(line);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        id: `blk-${crypto.randomUUID()}`,
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3 | 4,
        text: headingMatch[2].trim(),
      });
      currentBlockType = null;
      continue;
    }

    // Blockquote / Callout line
    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      currentBlockType = 'quote';
      quoteBuffer.push(line.slice(1).trim());
      continue;
    } else if (currentBlockType === 'quote' && line.trim() !== '') {
      quoteBuffer.push(line.trim());
      continue;
    } else if (currentBlockType === 'quote' && line.trim() === '') {
      flushQuote();
      currentBlockType = null;
      continue;
    }

    // List item
    const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
    const orderMatch = line.match(/^\d+\.\s+(.+)$/);
    if (bulletMatch || orderMatch) {
      flushParagraph();
      flushQuote();
      const style = bulletMatch ? 'bullet' : 'ordered';
      const rawText = bulletMatch ? bulletMatch[1] : orderMatch ? orderMatch[1] : '';
      const text = (rawText || '').trim();
      if (currentBlockType === 'list' && listStyle === style) {
        listBuffer.push(text);
      } else {
        flushList();
        currentBlockType = 'list';
        listStyle = style;
        listBuffer.push(text);
      }
      continue;
    } else if (currentBlockType === 'list' && line.trim() === '') {
      flushList();
      currentBlockType = null;
      continue;
    }

    // Blank line flushes paragraph
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushQuote();
      currentBlockType = null;
      continue;
    }

    // Accumulate paragraph line
    paragraphBuffer.push(line);
    currentBlockType = 'paragraph';
  }

  flushParagraph();
  flushCode();
  flushList();
  flushQuote();

  return blocks;
}

// ---------------------------------------------------------------------------
// Gate 5: Hardened URL Policy Engine
// ---------------------------------------------------------------------------

/** Helper to parse IP representations (decimal, hex, octal, shortened) into standard quad */
function parseIpHostToStandardQuad(hostname: string): string | null {
  const clean = hostname.replace(/\.$/, '');

  // 1. Single integer (decimal representation, e.g. 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(clean)) {
    const num = Number(clean);
    if (num >= 0 && num <= 4294967295) {
      return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
    }
  }

  // 2. Hexadecimal representation (e.g. 0x7f000001)
  if (/^0x[0-9a-fA-F]+$/.test(clean)) {
    const num = parseInt(clean, 16);
    if (num >= 0 && num <= 4294967295) {
      return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
    }
  }

  // 3. Octal or shortened IP parts (e.g. 0177.0.0.1, 127.1)
  const parts = clean.split('.');
  if (
    parts.length >= 2 &&
    parts.length <= 4 &&
    parts.every((p) => /^(0[0-7]*|[1-9]\d*|0x[0-9a-fA-F]+)$/.test(p))
  ) {
    try {
      const nums = parts.map((p) => {
        if (p.startsWith('0x') || p.startsWith('0X')) return parseInt(p, 16);
        if (p.startsWith('0') && p.length > 1) return parseInt(p, 8);
        return parseInt(p, 10);
      });
      if (parts.length === 2 && nums[0] !== undefined && nums[1] !== undefined)
        return `${nums[0]}.${(nums[1] >> 16) & 255}.${(nums[1] >> 8) & 255}.${nums[1] & 255}`;
      if (parts.length === 3 && nums[0] !== undefined && nums[1] !== undefined && nums[2] !== undefined)
        return `${nums[0]}.${nums[1]}.${(nums[2] >> 8) & 255}.${nums[2] & 255}`;
      if (parts.length === 4) return nums.join('.');
    } catch {
      return null;
    }
  }

  return null;
}

export function classifyAndValidateUrl(
  urlStr: string,
  intendedClassification: UrlClassification,
): { valid: boolean; classification: UrlClassification; reason?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'URL string is required.',
    };
  }

  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();

  // Reject control characters or unencoded spaces
  if (/[\r\n\t\0\s]/.test(trimmed)) {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'Control characters or unencoded whitespace in URLs are prohibited.',
    };
  }

  // Reject dangerous schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('ftp:')
  ) {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'Unsafe URL scheme detected.',
    };
  }

  // Parse URL safely
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'Malformed URL format.',
    };
  }

  // Reject credentials in userinfo (embedded credentials or % encoded)
  if (parsed.username || parsed.password || /%[0-9a-fA-F]{2}.*@/.test(trimmed)) {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'Credentials or userinfo in URLs are strictly prohibited.',
    };
  }

  // Private/staging/admin classifications are restricted from public display
  if (
    intendedClassification === 'private_internal' ||
    intendedClassification === 'preview_staging' ||
    intendedClassification === 'administrative'
  ) {
    return { valid: true, classification: intendedClassification };
  }

  // Public URL protocol check
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      classification: intendedClassification,
      reason: 'Public external project references must use https: protocol.',
    };
  }

  let hostname = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^\[|\]$/g, '');

  // Resolve IP aliases (decimal, hex, octal, shortened)
  const resolvedIp = parseIpHostToStandardQuad(hostname);
  if (resolvedIp) {
    hostname = resolvedIp;
  }

  // Reject loopback, localhost, and private networks (IPv4 & IPv6)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '0:0:0:0:0:0:0:1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fd00:') ||
    hostname.startsWith('fe80:') ||
    hostname.startsWith('::ffff:') ||
    hostname.includes('::ffff:')
  ) {
    return {
      valid: false,
      classification: intendedClassification,
      reason:
        'Public references cannot point to localhost, loopback, or private internal IP addresses.',
    };
  }

  return { valid: true, classification: intendedClassification };
}

// ---------------------------------------------------------------------------
// Gate 6: Evidence-Aware Editorial Controls
// ---------------------------------------------------------------------------
export function validateObjectiveSafety(
  title: string,
  summary: string | null,
): { valid: boolean; reason?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, reason: 'Project title cannot be empty.' };
  }
  if (title.length > 150) {
    return { valid: false, reason: 'Project title must not exceed 150 characters.' };
  }

  const combined = `${title} ${summary || ''}`.toLowerCase();

  // Reject numeric percentage/proficiency ratings
  if (
    /\b\d{1,3}\s*%/.test(combined) ||
    /\b(percentage|proficiency score|expert level \d|rating \d\/10)\b/.test(combined)
  ) {
    return {
      valid: false,
      reason: 'Project wording must not include percentage scores or numeric proficiency ratings.',
    };
  }

  // Reject XSS / unsafe script tags
  if (/<script|javascript:|onload=|onerror=|<iframe/i.test(combined)) {
    return { valid: false, reason: 'Project content contains unsafe HTML or script tags.' };
  }

  return { valid: true };
}

export interface EditorialWarning {
  readonly code: 'PROMOTIONAL_CLAIM' | 'UNSUPPORTED_METRIC_CLAIM' | 'AUTHORSHIP_CLAIM';
  readonly message: string;
  readonly targetTerm: string;
}

export function evaluateEditorialWording(params: {
  title: string;
  shortSummary?: string | null;
  caseStudyBlocks?: readonly ContentBlockV1[];
  ownerApproved?: boolean;
  supportingEvidenceIds?: readonly string[];
}): readonly EditorialWarning[] {
  const warnings: EditorialWarning[] = [];
  const textBody = [
    params.title,
    params.shortSummary || '',
    ...(params.caseStudyBlocks || []).map((b) => ('text' in b ? b.text : '')),
  ]
    .join(' ')
    .toLowerCase();

  const hasEvidence = (params.supportingEvidenceIds || []).length > 0;
  const isApproved = Boolean(params.ownerApproved);

  // Authoritative leadership / authorship claims
  const leadershipTerms = ['led', 'architected', 'spearheaded', 'built single-handedly'];
  for (const term of leadershipTerms) {
    if (textBody.includes(term) && (!isApproved || !hasEvidence)) {
      warnings.push({
        code: 'AUTHORSHIP_CLAIM',
        message: `Claim "${term}" requires owner approval and supporting evidence linkage.`,
        targetTerm: term,
      });
    }
  }

  // Metric / performance outcome claims
  const metricTerms = ['increased', 'reduced', 'improved', 'optimized by', '100x', 'zero downtime'];
  for (const term of metricTerms) {
    if (textBody.includes(term) && !hasEvidence) {
      warnings.push({
        code: 'UNSUPPORTED_METRIC_CLAIM',
        message: `Metric outcome claim "${term}" requires linked supporting evidence.`,
        targetTerm: term,
      });
    }
  }

  // Promotional superlatives
  const promotionalTerms = [
    'world-class',
    'unmatched',
    'flawless',
    'revolutionary',
    'best-in-class',
  ];
  for (const term of promotionalTerms) {
    if (textBody.includes(term)) {
      warnings.push({
        code: 'PROMOTIONAL_CLAIM',
        message: `Promotional adjective "${term}" flagged for owner editorial review.`,
        targetTerm: term,
      });
    }
  }

  return warnings;
}

/** Legacy wrapper maintained for backwards compatibility */
export function validateProjectWording(
  title: string,
  summary: string | null,
): { valid: boolean; reason?: string } {
  return validateObjectiveSafety(title, summary);
}

// ---------------------------------------------------------------------------
// Gate 7: Sensitive Data Handling & Dual Projection Sanitizer
// ---------------------------------------------------------------------------
export interface RedactionMetadata {
  readonly patternType: string;
  readonly matchLength: number;
  readonly position: number;
}

export function sanitizeEngineeringTextWithMetadata(text: string | null): {
  sanitizedText: string;
  redactionMetadata: readonly RedactionMetadata[];
} {
  if (!text || typeof text !== 'string') {
    return { sanitizedText: '', redactionMetadata: [] };
  }

  const redactionMetadata: RedactionMetadata[] = [];
  let sanitized = text;

  const patterns: { type: string; regex: RegExp }[] = [
    { type: 'BEARER_TOKEN', regex: /\bBearer\s+[a-zA-Z0-9_.-=]{16,}\b/gi },
    { type: 'API_KEY', regex: /\b(sk_live|pk_live|api_key|secret_key)_[a-zA-Z0-9]{16,}\b/gi },
    {
      type: 'PRIVATE_KEY',
      regex: /-----BEGIN\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+PRIVATE\s+KEY-----/gi,
    },
    { type: 'AUTH_HEADER', regex: /\b(Authorization|X-Api-Key):\s*["']?[^\s"']+["']?/gi },
    { type: 'COOKIE', regex: /\b(session|jwt|token|connect\.sid)=[a-zA-Z0-9_.-=]{16,}\b/gi },
    { type: 'DATABASE_URL', regex: /\b(postgres|postgresql|mongodb|mysql):\/\/[^\s"']+/gi },
    { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi },
    {
      type: 'INTERNAL_IP',
      regex:
        /\b(127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/gi,
    },
    { type: 'USER_ID', regex: /\busr_[a-zA-Z0-9]{12,}\b/gi },
  ];

  for (const { type, regex } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      redactionMetadata.push({
        patternType: type,
        matchLength: match[0].length,
        position: match.index,
      });
    }
    sanitized = sanitized.replace(regex, `[REDACTED_${type}]`);
  }

  return { sanitizedText: sanitized, redactionMetadata };
}

/** Legacy wrapper */
export function sanitizeEngineeringText(text: string | null): string {
  return sanitizeEngineeringTextWithMetadata(text).sanitizedText;
}

// ---------------------------------------------------------------------------
// Gate 3: Cycle Prevention Rules
// ---------------------------------------------------------------------------
export function validateAdrSupersession(
  existingAdrs: readonly { id: string; supersededBy: string | null }[],
  adrId: string,
  targetSupersededBy: string,
): { valid: boolean; reason?: string } {
  if (adrId === targetSupersededBy) {
    return { valid: false, reason: 'An ADR cannot supersede itself.' };
  }

  let current: string | null = targetSupersededBy;
  const visited = new Set<string>([adrId]);

  while (current) {
    if (visited.has(current)) {
      return { valid: false, reason: 'ADR supersession cycle detected.' };
    }
    visited.add(current);
    const parent = existingAdrs.find((a) => a.id === current);
    current = parent?.supersededBy || null;
  }

  return { valid: true };
}

export function validateVersionCycle(
  existingVersions: readonly { id: string; previousVersionId: string | null }[],
  versionId: string,
  targetPreviousId: string,
): { valid: boolean; reason?: string } {
  if (versionId === targetPreviousId) {
    return { valid: false, reason: 'A version cannot reference itself as previous version.' };
  }

  let current: string | null = targetPreviousId;
  const visited = new Set<string>([versionId]);

  while (current) {
    if (visited.has(current)) {
      return { valid: false, reason: 'Version lineage cycle detected.' };
    }
    visited.add(current);
    const parent = existingVersions.find((v) => v.id === current);
    current = parent?.previousVersionId || null;
  }

  return { valid: true };
}

export function validateProjectCycle(
  existingRelationships: readonly {
    sourceId: string;
    targetId: string;
    relationshipType: string;
  }[],
  sourceId: string,
  targetId: string,
): { valid: boolean; reason?: string } {
  if (sourceId === targetId) {
    return { valid: false, reason: 'Self-referential project relationships are prohibited.' };
  }

  // Cycle check for dependency types
  let currentTargets = [targetId];
  const visited = new Set<string>([sourceId]);

  while (currentTargets.length > 0) {
    const nextTargets: string[] = [];
    for (const tid of currentTargets) {
      if (visited.has(tid)) {
        return { valid: false, reason: 'Project dependency cycle detected.' };
      }
      visited.add(tid);
      const outgoing = existingRelationships.filter(
        (r) =>
          r.sourceId === tid &&
          ['depends_on', 'part_of', 'spawned_from'].includes(r.relationshipType),
      );
      for (const rel of outgoing) {
        nextTargets.push(rel.targetId);
      }
    }
    currentTargets = nextTargets;
  }

  return { valid: true };
}

export function validateProjectRelationship(params: {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  relevance: number;
}): { valid: boolean; reason?: string } {
  if (!params.sourceId || !params.targetId) {
    return { valid: false, reason: 'Source ID and target ID are required.' };
  }
  if (params.sourceId === params.targetId) {
    return { valid: false, reason: 'Self-referential project relationships are prohibited.' };
  }
  if (params.relevance < 1 || params.relevance > 5) {
    return { valid: false, reason: 'Relevance must be an integer between 1 and 5.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Gate 4: Centralized Public Project Projection & Multi-Mode Privacy
// ---------------------------------------------------------------------------
export function getPublicProjectProjection(params: {
  project: ProjectEntity;
  contributions: readonly ProjectContributionEntity[];
  experiments: readonly ExperimentEntity[];
  adrs: readonly ProjectAdrEntity[];
  debuggingLessons: readonly DebuggingLessonEntity[];
  deployments: readonly DeploymentEntity[];
  versions: readonly ProjectVersionEntity[];
  relationships: readonly ProjectRelationshipEntity[];
  nowIso?: string;
}): {
  project: ProjectEntity;
  contributions: readonly ProjectContributionEntity[];
  experiments: readonly ExperimentEntity[];
  adrs: readonly ProjectAdrEntity[];
  debuggingLessons: readonly DebuggingLessonEntity[];
  deployments: readonly DeploymentEntity[];
  versions: readonly ProjectVersionEntity[];
  relationships: readonly ProjectRelationshipEntity[];
} | null {
  const now = params.nowIso || new Date().toISOString();
  const proj = params.project;

  // 1. Parent Project Public Eligibility Rules
  if (
    proj.publicationState !== 'published' ||
    proj.visibility !== 'public' ||
    (proj.scheduledFor && proj.scheduledFor > now) ||
    (proj.embargoUntil && proj.embargoUntil > now) ||
    proj.deletedAt !== null
  ) {
    return null; // Opaque 404
  }

  // 2. Filter Children — Every child passes its own rules + parent rules
  const eligibleContributions = params.contributions.filter(
    (c) => c.visibility === 'public' && c.ownerApproval && c.deletedAt === null,
  );

  const eligibleExperiments = params.experiments.filter(
    (e) => e.visibility === 'public' && e.state === 'published' && e.deletedAt === null,
  );

  const eligibleAdrs = params.adrs.filter(
    (a) => a.visibility === 'public' && a.state === 'published' && a.deletedAt === null,
  );

  const eligibleDebugging = params.debuggingLessons.filter(
    (d) => d.visibility === 'public' && d.state === 'published' && d.deletedAt === null,
  );

  const eligibleDeployments = params.deployments.filter(
    (dep) =>
      dep.visibility === 'public' &&
      dep.publicationState === 'published' &&
      dep.deletedAt === null &&
      dep.deploymentUrl !== null &&
      classifyAndValidateUrl(
        dep.deploymentUrl,
        dep.environment === 'production' ? 'public_deployment' : 'preview_staging',
      ).valid,
  );

  const eligibleVersions = params.versions.filter(
    (v) => v.visibility === 'public' && v.state === 'published' && v.deletedAt === null,
  );

  const eligibleRelationships = params.relationships.filter(
    (r) => r.approvalState === 'accepted' && r.archivedAt === null,
  );

  return {
    project: proj,
    contributions: eligibleContributions,
    experiments: eligibleExperiments,
    adrs: eligibleAdrs,
    debuggingLessons: eligibleDebugging,
    deployments: eligibleDeployments,
    versions: eligibleVersions,
    relationships: eligibleRelationships,
  };
}
