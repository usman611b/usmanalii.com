import { describe, it, expect } from 'vitest';
import { profiles, skills, capabilities, evidenceItems, activities } from './index.js';

/**
 * Fixture validation tests.
 *
 * MANDATORY: These tests ensure fixtures never contain invented facts
 * about Usman Ali. They validate structural correctness of all fixtures.
 */

const FORBIDDEN_REAL_NAMES = [/\busman\b/i, /\bali\b/i, /\busmanalii\b/i];

function assertNoRealPersonData(obj: unknown, path = ''): void {
  if (typeof obj === 'string') {
    for (const pattern of FORBIDDEN_REAL_NAMES) {
      expect(pattern.test(obj), `Fixture field "${path}" contains real person data: "${obj}"`).toBe(
        false,
      );
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoRealPersonData(value, `${path}.${key}`);
    }
  }
}

describe('Fixture integrity — no real person data', () => {
  it('profiles contain no real person data', () => {
    assertNoRealPersonData(profiles);
  });
  it('skills contain no real person data', () => {
    assertNoRealPersonData(skills);
  });
  it('capabilities contain no real person data', () => {
    assertNoRealPersonData(capabilities);
  });
  it('evidenceItems contain no real person data', () => {
    assertNoRealPersonData(evidenceItems);
  });
  it('activities contain no real person data', () => {
    assertNoRealPersonData(activities);
  });
});

describe('Fixture coverage — all visibility states', () => {
  it('skills cover both public and private visibility', () => {
    const visibilities = Object.values(skills).map((s) => s.visibility);
    expect(visibilities).toContain('public');
    expect(visibilities).toContain('private');
  });

  it('capabilities cover multiple maturity states', () => {
    const maturities = Object.values(capabilities).map((c) => c.maturity);
    expect(maturities).toContain('not_enough_evidence');
    expect(maturities).toContain('exploring');
    expect(maturities).toContain('applying');
    expect(maturities).toContain('demonstrated');
  });

  it('evidence items cover multiple verification states', () => {
    const states = Object.values(evidenceItems).map((e) => e.verificationState);
    expect(states).toContain('owner_verified');
    expect(states).toContain('unreviewed');
    expect(states).toContain('broken');
    expect(states).toContain('archived');
  });

  it('activities include public, private and excluded fixtures', () => {
    expect(activities.publicActivity.visibility).toBe('public');
    expect(activities.privateActivity.visibility).toBe('private');
    expect(activities.excludedActivity.isExcluded).toBe(true);
  });
});

describe('Fixture invariants — no numeric proficiency', () => {
  it('capabilities have no proficiency field', () => {
    for (const cap of Object.values(capabilities)) {
      expect('proficiency' in cap).toBe(false);
      expect('proficiency_percent' in cap).toBe(false);
      expect('score' in cap).toBe(false);
    }
  });

  it('skills have no proficiency field', () => {
    for (const skill of Object.values(skills)) {
      expect('proficiency' in skill).toBe(false);
    }
  });
});

describe('Fixture invariants — default visibility is private', () => {
  it('profiles.privateProfile has private visibility', () => {
    expect(profiles.privateProfile.visibility).toBe('private');
  });

  it('skills.privateSkill has private visibility', () => {
    expect(skills.privateSkill.visibility).toBe('private');
  });

  it('evidenceItems.unreviewed has private visibility', () => {
    expect(evidenceItems.unreviewed.visibility).toBe('private');
  });
});

describe('Fixture invariants — IDOR test fixtures exist', () => {
  it('provides a fixture with a different ownerId for IDOR tests', () => {
    expect(skills.differentOwnerSkill.ownerId).not.toBe(skills.publicSkill.ownerId);
  });
});
