import { describe, it, expect } from 'vitest';
import { ContactFormSchema, ErrorCodeSchema } from './index.js';

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

  it('contains expected machine error codes', () => {
    expect(ErrorCodeSchema.options).toContain('AUTH_REQUIRED');
    expect(ErrorCodeSchema.options).toContain('FORBIDDEN');
    expect(ErrorCodeSchema.options).toContain('CLAIM_INTEGRITY_FAILED');
  });
});
