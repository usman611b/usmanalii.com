/**
 * Public search index generator and static projection utilities.
 *
 * Invariants:
 *  1. Only public, published, non-archived, non-deleted projects with valid schedule/embargo are indexed.
 *  2. Search projections extract text from structured case study blocks, ADR titles, experiment titles, debugging titles, and version summaries.
 *  3. Sensitive logs, private URLs, audit data, and internal notes are strictly excluded from search projections.
 */

export interface SearchableProjectInput {
  id: string;
  title: string;
  slug: string;
  shortSummary?: string | null;
  problemStatement?: string | null;
  contributionStatement?: string | null;
  recruiterSummary?: string | null;
  deepDiveContent?: string | null;
  caseStudyBody?: string | null;
  visibility: string;
  publicationState: string;
  scheduledFor?: string | null;
  embargoUntil?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface SearchableEngineeringItem {
  type: 'experiment' | 'adr' | 'debugging_lesson' | 'version';
  title: string;
  summary?: string | null;
  visibility: string;
  state: string;
}

export interface PublicProjectSearchDocument {
  id: string;
  title: string;
  slug: string;
  summary: string;
  searchableContent: string;
  indexedAt: string;
}

export function isProjectEligibleForSearch(project: SearchableProjectInput): boolean {
  if (project.visibility !== 'public' || project.publicationState !== 'published') return false;
  if (project.archivedAt || project.deletedAt) return false;

  const now = new Date().toISOString();
  if (project.scheduledFor && project.scheduledFor > now) return false;
  if (project.embargoUntil && project.embargoUntil > now) return false;

  return true;
}

export function buildProjectSearchDocument(
  project: SearchableProjectInput,
  engineeringItems: readonly SearchableEngineeringItem[] = [],
  skills: readonly string[] = [],
  capabilities: readonly string[] = [],
): PublicProjectSearchDocument | null {
  if (!isProjectEligibleForSearch(project)) {
    return null; // Instant de-indexing / exclusion
  }

  const textParts: string[] = [
    project.title,
    project.shortSummary || '',
    project.problemStatement || '',
    project.contributionStatement || '',
    project.recruiterSummary || '',
    project.deepDiveContent || '',
    ...skills,
    ...capabilities,
  ];

  // Parse caseStudyBody JSON blocks for bounded text extraction
  if (project.caseStudyBody) {
    try {
      const blocks = JSON.parse(project.caseStudyBody);
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          if (
            block &&
            typeof block === 'object' &&
            'text' in block &&
            typeof block.text === 'string'
          ) {
            textParts.push(block.text);
          }
        }
      }
    } catch {
      // Malformed canonical JSON fails closed; never index the raw payload.
      return null;
    }
  }

  // Include only public, published engineering child items
  for (const item of engineeringItems) {
    if (item.visibility === 'public' && item.state === 'published') {
      textParts.push(item.title);
      if (item.summary) textParts.push(item.summary);
    }
  }

  const cleanText = textParts
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000); // Bounded to 1000 chars

  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.shortSummary || project.title,
    searchableContent: cleanText,
    indexedAt: new Date().toISOString(),
  };
}

export function generateProjectJsonLd(
  project: SearchableProjectInput,
  canonicalUrl: string,
): Record<string, unknown>[] {
  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.title,
    description: project.shortSummary || project.title,
    url: canonicalUrl,
    programmingLanguage: 'TypeScript',
    codeRepository: 'https://github.com/usmanalii/monorepo',
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Projects',
        item: `${canonicalUrl.split('/projects/')[0]}/projects`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: project.title,
        item: canonicalUrl,
      },
    ],
  };

  return [creativeWork, breadcrumbs];
}

export interface ProjectSeoProjection {
  canonicalUrl: string;
  robots: 'index, follow';
  openGraph: { title: string; description: string; url: string };
  jsonLd: string;
}

/** SEO is derived from the same publication predicate as search and sitemap. */
export function buildProjectSeoProjection(
  project: SearchableProjectInput,
  origin = 'https://usmanalii.com',
): ProjectSeoProjection | null {
  if (!isProjectEligibleForSearch(project)) return null;
  const canonicalUrl = `${origin}/projects/record?slug=${encodeURIComponent(project.slug)}`;
  const jsonLd = JSON.stringify(generateProjectJsonLd(project, canonicalUrl))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return {
    canonicalUrl,
    robots: 'index, follow',
    openGraph: {
      title: project.title,
      description: project.shortSummary || project.title,
      url: canonicalUrl,
    },
    jsonLd,
  };
}

export function generateProjectSitemapUrls(
  projects: readonly SearchableProjectInput[],
  origin = 'https://usmanalii.com',
): readonly string[] {
  return projects
    .filter(isProjectEligibleForSearch)
    .map((project) => `${origin}/projects/record?slug=${encodeURIComponent(project.slug)}`);
}

// ---------------------------------------------------------------------------
// Milestone M7 Search Integration — Claims, Experience, Education, Credentials
// ---------------------------------------------------------------------------

export interface SearchableClaimInput {
  id: string;
  wording: string;
  approvedWording?: string | null;
  audience: string;
  context?: string | null;
  approvalState: string;
  visibility: string;
  state: string;
  archivedAt?: string | null;
  isEligible: boolean; // Computed by ClaimEligibilityEngine
}

export interface SearchableRecordInput {
  id: string;
  title: string; // company + role or institution + degree
  description?: string | null;
  visibility: string;
  state: string;
  archivedAt?: string | null;
}

export function isClaimEligibleForSearch(claim: SearchableClaimInput): boolean {
  if (claim.visibility !== 'public' || claim.state !== 'published') return false;
  if (claim.approvalState !== 'approved' || !claim.isEligible) return false;
  if (claim.archivedAt) return false;
  return true;
}

export function isRecordEligibleForSearch(rec: SearchableRecordInput): boolean {
  if (rec.visibility !== 'public' || rec.state !== 'published') return false;
  if (rec.archivedAt) return false;
  return true;
}

export interface PublicGenericSearchDocument {
  id: string;
  type: 'claim' | 'experience' | 'education' | 'credential';
  title: string;
  searchableContent: string;
  indexedAt: string;
}

export function buildClaimSearchDocument(
  claim: SearchableClaimInput,
): PublicGenericSearchDocument | null {
  if (!isClaimEligibleForSearch(claim)) return null;
  const wording = claim.approvedWording || claim.wording;
  return {
    id: claim.id,
    type: 'claim',
    title: wording.slice(0, 100),
    searchableContent: `${wording} ${claim.context || ''}`.trim(),
    indexedAt: new Date().toISOString(),
  };
}

export function buildRecordSearchDocument(
  rec: SearchableRecordInput,
  type: 'experience' | 'education' | 'credential',
): PublicGenericSearchDocument | null {
  if (!isRecordEligibleForSearch(rec)) return null;
  return {
    id: rec.id,
    type,
    title: rec.title,
    searchableContent: `${rec.title} ${rec.description || ''}`.trim(),
    indexedAt: new Date().toISOString(),
  };
}
