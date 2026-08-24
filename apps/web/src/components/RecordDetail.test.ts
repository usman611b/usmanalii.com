import { describe, expect, test } from 'vitest';
import { resolveRecordEndpoint } from './RecordDetail';

describe('resolveRecordEndpoint', () => {
  test('uses the runtime slug instead of the static record placeholder', () => {
    expect(
      resolveRecordEndpoint(
        { endpointBase: '/api/v1/public/projects', fallbackKey: 'record' },
        '?slug=ai-engineer-journey',
      ),
    ).toBe('/api/v1/public/projects/ai-engineer-journey');
  });

  test('supports encoded runtime IDs for private static shells', () => {
    expect(
      resolveRecordEndpoint(
        { endpointBase: '/api/v1/private/evidence', paramName: 'id', fallbackKey: 'record' },
        '?id=evidence/one',
      ),
    ).toBe('/api/v1/private/evidence/evidence%2Fone');
  });

  test('preserves an explicitly supplied endpoint', () => {
    expect(resolveRecordEndpoint({ endpoint: '/api/v1/public/profile' }, '')).toBe(
      '/api/v1/public/profile',
    );
  });
});
