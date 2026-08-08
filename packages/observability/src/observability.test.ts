import { describe, it, expect } from 'vitest';
import { createLogEntry, redactForLogging } from './index.js';

describe('Observability package', () => {
  it('creates a safe log entry with ISO timestamp', () => {
    const entry = createLogEntry('info', 'Test log message', {
      environment: 'local',
      requestId: 'req-123',
    });
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Test log message');
    expect(entry.environment).toBe('local');
    expect(entry.requestId).toBe('req-123');
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('redacts common token patterns from log text', () => {
    const input = 'Request with Bearer abc123def456xyz789 secret=mysecretkey';
    const redacted = redactForLogging(input);
    expect(redacted).toContain('Bearer [REDACTED]');
    expect(redacted).toContain('secret=[REDACTED]');
    expect(redacted).not.toContain('mysecretkey');
  });
});
