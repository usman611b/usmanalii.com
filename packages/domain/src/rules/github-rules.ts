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

export interface GitHubCoAuthor {
  readonly id?: number | null;
  readonly login?: string | null;
  readonly email?: string | null;
}

export interface GitHubCommitAuthorInfo {
  readonly authorId?: number | null;
  readonly authorLogin?: string | null;
  readonly authorEmail?: string | null;
  readonly authorType?: string | null;
  readonly committerId?: number | null;
  readonly committerLogin?: string | null;
  readonly committerEmail?: string | null;
  readonly committerType?: string | null;
  readonly message?: string | null;
  readonly coAuthors?: readonly GitHubCoAuthor[];
}

/**
 * Parses HTTP `Link` header for pagination URLs with loop protection.
 */
export function parseGitHubLinkHeader(
  header: string | null | undefined,
  visitedUrls?: ReadonlySet<string>,
): { nextUrl: string | null } {
  if (!header) return { nextUrl: null };
  const matches = header.split(',');
  for (const match of matches) {
    const section = match.split(';');
    const sec0 = section[0];
    const sec1 = section[1];
    if (sec0 && sec1) {
      const url = sec0.replace(/<|>/g, '').trim();
      const rel = sec1.trim();
      if (rel === 'rel="next"') {
        if (visitedUrls && visitedUrls.has(url)) {
          return { nextUrl: null }; // Infinite loop detected
        }
        return { nextUrl: url };
      }
    }
  }
  return { nextUrl: null };
}

/**
 * Parses Co-authored-by lines from commit message.
 * Example: `Co-authored-by: Alex Smith <alex@example.com>`
 */
export function parseCoAuthorsFromMessage(
  message: string | null | undefined,
): readonly GitHubCoAuthor[] {
  if (!message) return [];
  const coAuthors: GitHubCoAuthor[] = [];
  const regex = /^Co-authored-by:\s+([^<]+)<([^>]+)>/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(message)) !== null) {
    const emailGroup = match[2];
    if (emailGroup) {
      const email = emailGroup.trim().toLowerCase();
      if (email) {
        coAuthors.push({ email });
      }
    }
  }

  return coAuthors;
}

/**
 * Determines attribution status for an imported GitHub commit or pull request.
 * MANDATORY INVARIANT: Stable GitHub numeric user ID is the strongest attribution signal.
 */
export function matchCommitAttribution(
  commitInfo: GitHubCommitAuthorInfo,
  ownerIdentity: GitHubOwnerIdentityEntity | null,
): AttributionStatus {
  if (!ownerIdentity) {
    return 'unverified_author';
  }

  const authorId = commitInfo.authorId ?? null;
  const committerId = commitInfo.committerId ?? null;
  const authorLogin = commitInfo.authorLogin?.toLowerCase() ?? '';
  const committerLogin = commitInfo.committerLogin?.toLowerCase() ?? '';
  const authorEmail = commitInfo.authorEmail?.toLowerCase() ?? '';
  const committerEmail = commitInfo.committerEmail?.toLowerCase() ?? '';
  const approvedEmails = ownerIdentity.commitEmails.map((e) => e.toLowerCase());

  // Extract co-authors from message or explicit field
  const parsedCoAuthors = parseCoAuthorsFromMessage(commitInfo.message);
  const allCoAuthors = [...(commitInfo.coAuthors || []), ...parsedCoAuthors];

  // 1. Primary Signal: Stable numeric GitHub User ID
  if (
    (authorId !== null && authorId === ownerIdentity.githubUserId) ||
    (committerId !== null && committerId === ownerIdentity.githubUserId) ||
    allCoAuthors.some((ca) => ca.id === ownerIdentity.githubUserId)
  ) {
    return 'verified_owner';
  }

  // 2. Approved Email fallback (including private / no-reply GitHub emails)
  if (
    (authorEmail && approvedEmails.includes(authorEmail)) ||
    (committerEmail && approvedEmails.includes(committerEmail)) ||
    allCoAuthors.some((ca) => ca.email && approvedEmails.includes(ca.email.toLowerCase()))
  ) {
    return 'verified_owner';
  }

  // 3. Login Match (only if ID/email didn't contradict)
  const ownerLogin = ownerIdentity.githubLogin.toLowerCase();
  if (authorLogin === ownerLogin || committerLogin === ownerLogin) {
    return 'verified_owner';
  }

  // 4. Bot & Automation check
  // Do NOT classify web-flow as bot if author matches owner!
  if (
    commitInfo.authorType === 'Bot' ||
    commitInfo.committerType === 'Bot' ||
    authorLogin.endsWith('[bot]') ||
    committerLogin.endsWith('[bot]') ||
    authorLogin === 'dependabot' ||
    authorLogin === 'github-actions' ||
    authorLogin === 'renovate'
  ) {
    return 'bot_ignored';
  }

  // Handle web-flow (GitHub web interface commit) where author was not owner
  if (committerLogin === 'web-flow' && authorLogin !== ownerLogin) {
    return 'ambiguous';
  }

  // 5. Ambiguous check
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

function formatDateInTimezone(date: Date, targetTimezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
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
  const nowMs = Date.now();

  // Filter for public view & bounds (excluding future events and unpublished private items for public view)
  const filteredEvents = events.filter((ev) => {
    const evMs = new Date(ev.dateIso).getTime();
    if (isNaN(evMs) || evMs > nowMs) {
      return false; // Exclude future events
    }
    if (isPublicView) {
      return ev.visibility === 'public' && ev.isPublished;
    }
    return true;
  });

  const cellsMap = new Map<string, { count: number; eventIds: Set<string>; types: Set<string> }>();

  for (const ev of filteredEvents) {
    const eventTime = new Date(ev.dateIso).getTime();
    if (isNaN(eventTime) || eventTime < startMs || eventTime > endMs) {
      continue;
    }

    // Determine YYYY-MM-DD in target timezone
    const dateStr = formatDateInTimezone(new Date(ev.dateIso), targetTimezone);

    const current = cellsMap.get(dateStr) ?? { count: 0, eventIds: new Set(), types: new Set() };
    if (!current.eventIds.has(ev.id)) {
      current.eventIds.add(ev.id);
      current.count += 1;
      current.types.add(ev.type);
    }
    cellsMap.set(dateStr, current);
  }

  const cells: ActivityHeatmapCell[] = [];
  let totalActivities = 0;
  let activeDaysCount = 0;

  // Generate continuous daily range from start to end date
  const startDateKey = formatDateInTimezone(new Date(startDateIso), targetTimezone);
  const endDateKey = formatDateInTimezone(new Date(endDateIso), targetTimezone);
  const loopStartMs = Date.parse(`${startDateKey}T12:00:00.000Z`);
  const loopEndMs = Date.parse(`${endDateKey}T12:00:00.000Z`);
  const dayMs = 86400000;
  const dayCount = Math.round((loopEndMs - loopStartMs) / dayMs) + 1;

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const dateKey = new Date(loopStartMs + dayIndex * dayMs).toISOString().slice(0, 10);

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
      eventTypes: isPublicView ? [] : Array.from(cellData?.types ?? []), // Obscure private event types in public view
    });
  }

  return {
    timezone: targetTimezone,
    startDate: startDateKey,
    endDate: endDateKey,
    cells,
    totalActivities,
    activeDaysCount,
  };
}
