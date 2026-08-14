/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'vitest';
import {
  parseGitHubLinkHeader,
  parseCoAuthorsFromMessage,
  matchCommitAttribution,
  computeActivityHeatmap,
  type GitHubCommitAuthorInfo,
} from './github-rules.js';
import type { GitHubOwnerIdentityEntity } from '../entities/index.js';

describe('GitHub Domain Rules Engine & Attribution (M6 Gate 2)', () => {
  const mockIdentity: GitHubOwnerIdentityEntity = {
    id: 'id-1' as any,
    ownerId: 'owner-1' as any,
    githubUserId: 998877,
    githubLogin: 'usmanalii',
    commitEmails: ['usman@example.com', '998877+usmanalii@users.noreply.github.com'],
    verificationStatus: 'verified',
    ownerApproval: true,
    lastVerifiedAt: null,
    createdAt: '2026-01-01T00:00:00Z' as any,
    updatedAt: '2026-01-01T00:00:00Z' as any,
  };

  test('parseGitHubLinkHeader handles rel="next" and detects loops', () => {
    const header = '<https://api.github.com/user/repos?page=2>; rel="next"';
    expect(parseGitHubLinkHeader(header)).toEqual({
      nextUrl: 'https://api.github.com/user/repos?page=2',
    });

    const visited = new Set(['https://api.github.com/user/repos?page=2']);
    expect(parseGitHubLinkHeader(header, visited)).toEqual({ nextUrl: null });
  });

  test('parseCoAuthorsFromMessage extracts co-authors from commit message', () => {
    const msg =
      'feat: add security middleware\n\nCo-authored-by: Jane Doe <jane@example.com>\nCo-authored-by: Usman Ali <usman@example.com>';
    const coAuthors = parseCoAuthorsFromMessage(msg);
    expect(coAuthors).toHaveLength(2);
    expect(coAuthors[0].email).toBe('jane@example.com');
    expect(coAuthors[1].email).toBe('usman@example.com');
  });

  // Table-driven attribution test suite covering Section 2 requirements
  const attributionCases: {
    name: string;
    info: GitHubCommitAuthorInfo;
    identity: GitHubOwnerIdentityEntity | null;
    expected: 'verified_owner' | 'unverified_author' | 'bot_ignored' | 'ambiguous';
  }[] = [
    {
      name: '1. Numeric user-ID match (strongest signal)',
      info: { authorId: 998877, authorLogin: 'new_login_name', authorEmail: 'unknown@example.com' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '2. Changed login with stable numeric ID',
      info: { authorId: 998877, authorLogin: 'usman-ali-renamed' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '3. Approved email fallback',
      info: { authorId: null, authorLogin: 'unknown_handle', authorEmail: 'usman@example.com' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '4. GitHub private noreply email handling',
      info: { authorId: null, authorEmail: '998877+usmanalii@users.noreply.github.com' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '5. Committer ID match when author is null/missing',
      info: { committerId: 998877, committerLogin: 'usmanalii' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '6. Co-authored commit matching owner email in message',
      info: {
        authorId: 11111,
        authorLogin: 'peer_dev',
        message: 'feat: pair programming\n\nCo-authored-by: Usman Ali <usman@example.com>',
      },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '7. GitHub web-interface commit (web-flow committer) with owner author',
      info: {
        authorId: 998877,
        authorLogin: 'usmanalii',
        committerLogin: 'web-flow',
      },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '8. Dependabot & verified bot accounts',
      info: { authorId: 49699333, authorLogin: 'dependabot[bot]', authorType: 'Bot' },
      identity: mockIdentity,
      expected: 'bot_ignored',
    },
    {
      name: '9. Spoofed bot-like login with owner numeric ID is verified',
      info: { authorId: 998877, authorLogin: 'dependabot[bot]' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '10. Login-only match when numeric ID is unavailable',
      info: { authorLogin: 'USMANALII' },
      identity: mockIdentity,
      expected: 'verified_owner',
    },
    {
      name: '11. Ambiguous attribution for unverified author on shared repo',
      info: { authorId: 55555, authorLogin: 'some_other_dev', authorEmail: 'other@example.com' },
      identity: mockIdentity,
      expected: 'ambiguous',
    },
    {
      name: '12. Missing owner identity returns unverified_author',
      info: { authorId: 998877, authorLogin: 'usmanalii' },
      identity: null,
      expected: 'unverified_author',
    },
  ];

  test.each(attributionCases)('$name', ({ info, identity, expected }) => {
    expect(matchCommitAttribution(info, identity)).toBe(expected);
  });

  test('computeActivityHeatmap respects timezone, masks counts for public view, and excludes future events', () => {
    const now = new Date();
    const todayIso = now.toISOString();
    const futureIso = new Date(now.getTime() + 86400 * 1000 * 5).toISOString();

    const events = [
      {
        id: 'ev-1',
        dateIso: todayIso,
        type: 'journal_entry',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'ev-1', // Duplicate event ID on same day
        dateIso: todayIso,
        type: 'journal_entry',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'ev-2',
        dateIso: todayIso,
        type: 'commit',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'ev-future',
        dateIso: futureIso,
        type: 'commit',
        visibility: 'public' as const,
        isPublished: true,
      },
    ];

    const publicProj = computeActivityHeatmap(
      events,
      new Date(now.getTime() - 86400 * 1000 * 2).toISOString(),
      todayIso,
      'Asia/Karachi',
      true,
    );

    // Duplicate event ev-1 deduplicated; future event excluded
    expect(publicProj.totalActivities).toBe(2);
    const todayInTargetTimezone = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const todayCell = publicProj.cells.find((c) => c.date === todayInTargetTimezone);
    expect(todayCell?.count).toBe(1); // Count masked to 1 for public view
    expect(todayCell?.eventTypes).toEqual([]); // Obscured in public view
  });

  test('activity heatmap deduplicates events and respects timezone day boundaries', () => {
    const events = [
      {
        id: 'boundary-event',
        dateIso: '2026-08-08T20:30:00.000Z',
        type: 'commit',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'boundary-event',
        dateIso: '2026-08-08T20:30:00.000Z',
        type: 'commit',
        visibility: 'public' as const,
        isPublished: true,
      },
    ];

    const projection = computeActivityHeatmap(
      events,
      '2026-08-08T00:00:00.000Z',
      '2026-08-09T23:59:59.999Z',
      'Asia/Karachi',
      false,
    );

    expect(projection.totalActivities).toBe(1);
    expect(projection.cells.find((cell) => cell.date === '2026-08-09')?.count).toBe(1);
  });

  test('public activity heatmap excludes private and unpublished activity without count leakage', () => {
    const events = [
      {
        id: 'public',
        dateIso: '2026-08-08T12:00:00.000Z',
        type: 'commit',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'private',
        dateIso: '2026-08-08T12:00:00.000Z',
        type: 'commit',
        visibility: 'private' as const,
        isPublished: true,
      },
      {
        id: 'draft',
        dateIso: '2026-08-08T12:00:00.000Z',
        type: 'commit',
        visibility: 'public' as const,
        isPublished: false,
      },
    ];

    const projection = computeActivityHeatmap(
      events,
      '2026-08-08T00:00:00.000Z',
      '2026-08-08T23:59:59.999Z',
      'UTC',
      true,
    );

    expect(projection.totalActivities).toBe(1);
    expect(projection.cells[0]?.count).toBe(1);
    expect(projection.cells[0]?.eventTypes).toEqual([]);
  });
});
