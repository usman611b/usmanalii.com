import { describe, expect, test } from 'vitest';
import {
  parseGitHubLinkHeader,
  matchCommitAttribution,
  generateCandidateFingerprint,
  computeActivityHeatmap,
} from './github-rules.js';
import type { GitHubOwnerIdentityEntity } from '../entities/index.js';

describe('GitHub Domain Rules Engine (M6)', () => {
  test('parseGitHubLinkHeader parses rel="next" header correctly', () => {
    const header = '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=5>; rel="last"';
    expect(parseGitHubLinkHeader(header)).toEqual({
      nextUrl: 'https://api.github.com/user/repos?page=2',
    });
    expect(parseGitHubLinkHeader(null)).toEqual({ nextUrl: null });
    expect(parseGitHubLinkHeader('')).toEqual({ nextUrl: null });
  });

  test('matchCommitAttribution classifies owner, bots, and unverified authors', () => {
    const mockIdentity: GitHubOwnerIdentityEntity = {
      id: 'id-1' as any,
      ownerId: 'owner-1' as any,
      githubUserId: 12345,
      githubLogin: 'usmanalii',
      commitEmails: ['usman@example.com'],
      verificationStatus: 'verified',
      ownerApproval: true,
      lastVerifiedAt: null,
      createdAt: '2026-01-01T00:00:00Z' as any,
      updatedAt: '2026-01-01T00:00:00Z' as any,
    };

    // 1. Bot check
    expect(
      matchCommitAttribution(
        { authorLogin: 'dependabot[bot]', committerLogin: 'github-actions' },
        mockIdentity,
      ),
    ).toBe('bot_ignored');

    // 2. Numeric User ID match
    expect(
      matchCommitAttribution(
        { authorId: 12345, authorLogin: 'other', authorEmail: 'other@example.com' },
        mockIdentity,
      ),
    ).toBe('verified_owner');

    // 3. Login match
    expect(
      matchCommitAttribution(
        { authorId: 99999, authorLogin: 'USMANALII', authorEmail: 'other@example.com' },
        mockIdentity,
      ),
    ).toBe('verified_owner');

    // 4. Approved email match
    expect(
      matchCommitAttribution(
        { authorId: 99999, authorLogin: 'someone', authorEmail: 'usman@example.com' },
        mockIdentity,
      ),
    ).toBe('verified_owner');

    // 5. Ambiguous match
    expect(
      matchCommitAttribution(
        { authorId: 99999, authorLogin: 'someone_else', authorEmail: 'someone@example.com' },
        mockIdentity,
      ),
    ).toBe('ambiguous');

    // 6. No identity configured
    expect(
      matchCommitAttribution(
        { authorId: 12345, authorLogin: 'usmanalii' },
        null,
      ),
    ).toBe('unverified_author');
  });

  test('generateCandidateFingerprint creates deterministic fingerprint', () => {
    const fp1 = generateCandidateFingerprint('github', 'commit', 'abc1234');
    const fp2 = generateCandidateFingerprint('github', 'COMMIT', 'abc1234');
    expect(fp1).toBe('github:commit:abc1234');
    expect(fp1).toBe(fp2);
  });

  test('computeActivityHeatmap aggregates events into timezone-aware day cells', () => {
    const events = [
      {
        id: 'e1',
        dateIso: '2026-08-01T10:00:00Z',
        type: 'journal_entry',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'e2',
        dateIso: '2026-08-01T15:00:00Z',
        type: 'deployment',
        visibility: 'public' as const,
        isPublished: true,
      },
      {
        id: 'e3',
        dateIso: '2026-08-02T05:00:00Z',
        type: 'commit',
        visibility: 'private' as const,
        isPublished: false,
      },
    ];

    const privateProjection = computeActivityHeatmap(
      events,
      '2026-08-01T00:00:00Z',
      '2026-08-03T00:00:00Z',
      'UTC',
      false,
    );

    expect(privateProjection.totalActivities).toBe(3);
    expect(privateProjection.activeDaysCount).toBe(2);
    expect(privateProjection.cells.length).toBeGreaterThanOrEqual(3);

    const day1 = privateProjection.cells.find((c) => c.date === '2026-08-01');
    expect(day1?.count).toBe(2);
    expect(day1?.intensity).toBe(2);

    const publicProjection = computeActivityHeatmap(
      events,
      '2026-08-01T00:00:00Z',
      '2026-08-03T00:00:00Z',
      'UTC',
      true,
    );

    // Private commit on 2026-08-02 excluded from public view
    expect(publicProjection.totalActivities).toBe(2);
    expect(publicProjection.activeDaysCount).toBe(1);
    const publicDay2 = publicProjection.cells.find((c) => c.date === '2026-08-02');
    expect(publicDay2?.count).toBe(0);
  });
});
