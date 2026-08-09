/**
 * Pure Domain Business Rules for GitHub Evidence Integration — Milestone M6.
 */

import type {
  ActivityHeatmapCell,
  ActivityProjection,
  AttributionStatus,
  GitHubOwnerIdentityEntity,
  Visibility,
} from '../entities/index.js';

export interface GitHubCommitAuthorInfo {
  readonly authorId?: number | null;
  readonly authorLogin?: string | null;
  readonly authorEmail?: string | null;
  readonly committerId?: number | null;
  readonly committerLogin?: string | null;
  readonly committerEmail?: string | null;
  readonly message?: string;
}

/**
 * Parses HTTP `Link` header for pagination URLs.
 */
export function parseGitHubLinkHeader(header: string | null | undefined): { nextUrl: string | null } {
  if (!header) return { nextUrl: null };
  const matches = header.split(',');
  for (const match of matches) {
    const section = match.split(';');
    if (section.length === 2) {
      const url = section[0].replace(/<|>/g, '').trim();
      const rel = section[1].trim();
      if (rel === 'rel="next"') {
        return { nextUrl: url };
      }
    }
  }
  return { nextUrl: null };
}

/**
 * Determines attribution status for an imported GitHub commit or pull request.
 */
export function matchCommitAttribution(
  commitInfo: GitHubCommitAuthorInfo,
  ownerIdentity: GitHubOwnerIdentityEntity | null,
): AttributionStatus {
  // 1. Bot check
  const authorLogin = commitInfo.authorLogin?.toLowerCase() ?? '';
  const committerLogin = commitInfo.committerLogin?.toLowerCase() ?? '';
  if (
    authorLogin.includes('[bot]') ||
    committerLogin.includes('[bot]') ||
    authorLogin.endsWith('-bot') ||
    committerLogin.endsWith('-bot') ||
    authorLogin === 'web-flow'
  ) {
    return 'bot_ignored';
  }

  if (!ownerIdentity) {
    return 'unverified_author';
  }

  // 2. Stable numeric GitHub User ID match (Primary)
  if (
    commitInfo.authorId === ownerIdentity.githubUserId ||
    commitInfo.committerId === ownerIdentity.githubUserId
  ) {
    return 'verified_owner';
  }

  // 3. Login match
  const ownerLogin = ownerIdentity.githubLogin.toLowerCase();
  if (authorLogin === ownerLogin || committerLogin === ownerLogin) {
    return 'verified_owner';
  }

  // 4. Approved email match
  const authorEmail = commitInfo.authorEmail?.toLowerCase() ?? '';
  const committerEmail = commitInfo.committerEmail?.toLowerCase() ?? '';
  const approvedEmails = ownerIdentity.commitEmails.map((e) => e.toLowerCase());

  if (
    (authorEmail && approvedEmails.includes(authorEmail)) ||
    (committerEmail && approvedEmails.includes(committerEmail))
  ) {
    return 'verified_owner';
  }

  // 5. Ambiguous check (e.g. shared repo commit with unverified author)
  return 'ambiguous';
}

/**
 * Computes deterministic fingerprint for candidate deduplication.
 */
export function generateCandidateFingerprint(
  provider: string,
  externalType: string,
  externalId: string,
): string {
  return `${provider}:${externalType.toLowerCase()}:${externalId}`;
}

export interface DatedEventInput {
  readonly id: string;
  readonly dateIso: string; // UTC ISO string
  readonly type: string;
  readonly visibility: Visibility;
  readonly isPublished: boolean;
}

/**
 * Computes a timezone-aware Activity Heatmap projection.
 */
export function computeActivityHeatmap(
  events: readonly DatedEventInput[],
  startDateIso: string,
  endDateIso: string,
  targetTimezone: string = 'UTC',
  isPublicView: boolean = false,
): ActivityProjection {
  const startMs = new Date(startDateIso).getTime();
  const endMs = new Date(endDateIso).getTime();

  // Filter for public view if requested
  const filteredEvents = events.filter((ev) => {
    if (isPublicView) {
      return ev.visibility === 'public' && ev.isPublished;
    }
    return true;
  });

  const cellsMap = new Map<string, { count: number; types: Set<string> }>();

  for (const ev of filteredEvents) {
    const eventTime = new Date(ev.dateIso).getTime();
    if (isNaN(eventTime) || eventTime < startMs || eventTime > endMs) {
      continue;
    }

    // Determine YYYY-MM-DD in target timezone
    let dateStr = '';
    try {
      dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(ev.dateIso));
    } catch {
      dateStr = ev.dateIso.slice(0, 10);
    }

    const current = cellsMap.get(dateStr) ?? { count: 0, types: new Set() };
    current.count += 1;
    current.types.add(ev.type);
    cellsMap.set(dateStr, current);
  }

  const cells: ActivityHeatmapCell[] = [];
  let totalActivities = 0;
  let activeDaysCount = 0;

  // Generate continuous daily range from start to end date
  let curr = new Date(startDateIso);
  const end = new Date(endDateIso);

  while (curr <= end) {
    let dateKey = '';
    try {
      dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(curr);
    } catch {
      dateKey = curr.toISOString().slice(0, 10);
    }

    const cellData = cellsMap.get(dateKey);
    const count = cellData?.count ?? 0;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;

    if (count > 0) {
      activeDaysCount += 1;
      totalActivities += count;
      if (count === 1) intensity = 1;
      else if (count <= 3) intensity = 2;
      else if (count <= 6) intensity = 3;
      else intensity = 4;
    }

    cells.push({
      date: dateKey,
      count: isPublicView ? (count > 0 ? 1 : 0) : count, // Public view masks exact count to 1 or 0
      intensity,
      eventTypes: Array.from(cellData?.types ?? []),
    });

    curr.setDate(curr.getDate() + 1);
  }

  return {
    timezone: targetTimezone,
    startDate: startDateIso.slice(0, 10),
    endDate: endDateIso.slice(0, 10),
    cells,
    totalActivities,
    activeDaysCount,
  };
}
