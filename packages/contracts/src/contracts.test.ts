import { describe, it, expect } from 'vitest';
import {
  ContactFormSchema,
  CreateCareerRoleRequestSchema,
  ErrorCodeSchema,
  UpdateCareerRoleRequestSchema,
  UpdateProfileRequestSchema,
} from './index.js';

describe('Contracts package exports', () => {
  it('validates ContactFormSchema correctly', () => {
    const valid = ContactFormSchema.safeParse({
      name: 'Test Visitor',
      email: 'visitor@example.com',
      message: 'Hello, this is a test message.',
      turnstileToken: 'test-token-123',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects ContactFormSchema with invalid email', () => {
    const invalid = ContactFormSchema.safeParse({
      name: 'Test Visitor',
      email: 'not-an-email',
      message: 'Hello, this is a test message.',
      turnstileToken: 'test-token-123',
    });
    expect(invalid.success).toBe(false);
  });

  it('requires a bounded Turnstile token for ContactFormSchema', () => {
    expect(
      ContactFormSchema.safeParse({
        name: 'Test Visitor',
        email: 'visitor@example.com',
        message: 'Hello, this is a test message.',
      }).success,
    ).toBe(false);
    expect(
      ContactFormSchema.safeParse({
        name: 'Test Visitor',
        email: 'visitor@example.com',
        message: 'Hello, this is a test message.',
        turnstileToken: 'x'.repeat(2049),
      }).success,
    ).toBe(false);
  });

  it('validates owner-defined career role boundaries declaratively', () => {
    expect(
      CreateCareerRoleRequestSchema.safeParse({
        name: 'AI/ML Engineer',
        slug: 'ai-ml-engineer',
        color: '#25E6FF',
      }).success,
    ).toBe(true);
    expect(
      UpdateCareerRoleRequestSchema.safeParse({
        name: 'AI/ML Engineer',
        slug: 'Invalid Slug',
        color: '#25E6FF',
        visibility: 'public',
        publicationState: 'published',
        versionNo: 1,
      }).success,
    ).toBe(false);
  });

  it('contains expected machine error codes', () => {
    expect(ErrorCodeSchema.options).toContain('AUTH_REQUIRED');
    expect(ErrorCodeSchema.options).toContain('FORBIDDEN');
    expect(ErrorCodeSchema.options).toContain('CLAIM_INTEGRITY_FAILED');
  });

  it('accepts safe site-relative profile assets', () => {
    const result = UpdateProfileRequestSchema.safeParse({
      versionNo: 1,
      profileImageUrl: '/images/usman-portrait.webp',
      resumeAssetUrl: '/assets/usman-ali-resume.pdf',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsafe or incorrectly branded profile URLs', () => {
    expect(
      UpdateProfileRequestSchema.safeParse({
        versionNo: 1,
        profileImageUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
    expect(
      UpdateProfileRequestSchema.safeParse({
        versionNo: 1,
        githubUrl: 'https://example.com/not-github',
      }).success,
    ).toBe(false);
  });
});
