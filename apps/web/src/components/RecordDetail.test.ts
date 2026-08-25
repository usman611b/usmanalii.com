import { describe, expect, test } from 'vitest';
import {
  resolveLinkedRecordHref,
  resolveRecordEndpoint,
  resolveRecordRoot,
  resolveSectionRecordHref,
} from './RecordDetail';

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

  test('unwraps private evidence payloads instead of rendering an untitled wrapper', () => {
    expect(
      resolveRecordRoot({
        item: { id: 'evidence-1', title: 'Verified Python source' },
        verificationHistory: [],
      }),
    ).toMatchObject({ id: 'evidence-1', title: 'Verified Python source' });
  });

  test('builds working private evidence relationship destinations', () => {
    expect(
      resolveLinkedRecordHref({ targetType: 'project', targetId: 'project/one' }, true),
    ).toBe('/dashboard/projects/record?id=project%2Fone');
    expect(
      resolveLinkedRecordHref({ targetType: 'content_item', targetId: 'day-02' }, true),
    ).toBe('/dashboard/journal/record/edit?id=day-02');
  });

  test('builds a public evidence detail destination', () => {
    expect(
      resolveLinkedRecordHref({ targetType: 'evidence', targetId: 'evidence-02' }, false),
    ).toBe('/evidence/record?id=evidence-02');
  });

  test('makes project-support sections navigable', () => {
    expect(
      resolveSectionRecordHref('evidence', { id: 'evidence-21' }, false),
    ).toBe('/evidence/record?id=evidence-21');
    expect(
      resolveSectionRecordHref('artifacts', { id: 'artifact-index' }, false),
    ).toBe('/api/v1/public/artifacts/artifact-index/download');
    expect(
      resolveSectionRecordHref('journalLinks', { slug: 'day-21' }, false),
    ).toBe('/journey/record?slug=day-21');
  });
});
