import { describe, expect, it } from 'vitest';
import { resolveProjectCaseStudyEndpoint } from './ProjectCaseStudy';

describe('Work project case-study routing', () => {
  it('loads the selected project from the live public API', () => {
    expect(resolveProjectCaseStudyEndpoint('?slug=ai-engineer-journey')).toBe(
      '/api/v1/public/projects/ai-engineer-journey',
    );
  });

  it('encodes runtime project slugs', () => {
    expect(resolveProjectCaseStudyEndpoint('?slug=career%20os')).toBe(
      '/api/v1/public/projects/career%20os',
    );
  });

  it('uses the static shell fallback and refuses an unidentified request', () => {
    expect(resolveProjectCaseStudyEndpoint('', 'record')).toBe('/api/v1/public/projects/record');
    expect(resolveProjectCaseStudyEndpoint('')).toBeNull();
  });
});
