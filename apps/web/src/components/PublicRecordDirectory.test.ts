import { describe, expect, test } from 'vitest';
import { buildPublicRecordHref } from './PublicRecordDirectory';

describe('buildPublicRecordHref', () => {
  test('makes public evidence cards inspectable by canonical ID', () => {
    expect(buildPublicRecordHref('evidence', { id: 'evidence/day-02' })).toBe(
      '/evidence/record?id=evidence%2Fday-02',
    );
  });

  test('keeps slug-backed records on the static record shell', () => {
    expect(buildPublicRecordHref('projects', { slug: 'ai-engineer-journey' })).toBe(
      '/projects/record?slug=ai-engineer-journey',
    );
  });
});
