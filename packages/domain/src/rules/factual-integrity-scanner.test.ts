import { describe, expect, it } from 'vitest';
import { scanForFactualIntegrity } from './factual-integrity-scanner.js';

describe('Factual Integrity Scanner (M7)', () => {
  it('passes authentic professional text without invented metrics', () => {
    const text =
      'Designed and built the Personal Career OS using TypeScript and Cloudflare Workers.';
    const result = scanForFactualIntegrity(text);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects unsourced percentage metrics', () => {
    const text = 'Improved database query response times by 85%';
    const result = scanForFactualIntegrity(text);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('NO_UNSOURCED_PERCENTAGE_METRICS');
  });

  it('detects lorem ipsum placeholder text', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    const result = scanForFactualIntegrity(text);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('NO_PLACEHOLDER_OR_LOREM_TEXT');
  });

  it('detects prohibited invented claims attributed to Usman Ali', () => {
    const text = 'Usman Ali worked at Google for 5 years.';
    const result = scanForFactualIntegrity(text);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('NO_INVENTED_USMAN_ALI_FACTS');
  });
});
