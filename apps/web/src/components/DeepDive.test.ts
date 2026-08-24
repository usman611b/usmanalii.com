import { describe, expect, it } from 'vitest';
import { deepDiveProjectHref } from './DeepDiveExplorer';
import { resolveDeepDiveEndpoint } from './DeepDiveProject';

describe('Deep Dive routing', () => {
  it('uses the static-safe project detail shell', () => {
    expect(deepDiveProjectHref('career-os')).toBe('/deep-dive/record?slug=career-os');
  });

  it('resolves a runtime slug without trusting path placeholders', () => {
    expect(resolveDeepDiveEndpoint('?slug=career%20os')).toBe(
      '/api/v1/public/projects/career%20os',
    );
  });

  it('refuses to call the project API without a selected project', () => {
    expect(resolveDeepDiveEndpoint('')).toBeNull();
  });
});
