/**
 * Factual Integrity Scanner — Milestone M7 Requirement & Gate
 *
 * Scans public content, DTOs, and HTML strings to ensure no fictional professional content
 * (such as invented percentages, fake employers, unsourced metrics, or placeholder text)
 * enters public projections or is attributed to Usman Ali.
 */

export interface FactualViolation {
  readonly rule: string;
  readonly snippet: string;
  readonly explanation: string;
}

export interface FactualScanResult {
  readonly isValid: boolean;
  readonly violations: readonly FactualViolation[];
}

const INVENTED_METRIC_PATTERNS = [
  /\b(improved|increased|boosted|reduced|decreased)\b.*?\bby\s+\d+%/i,
  /\bby\s+\d+%/i,
  /\b\d+%\s+(faster|better|reduction|increase|growth)\b/i,
  /\btop\s+\d+%\b/i,
  /\bproficiency:\s*\d+%/i,
];

const LOREM_IPSUM_PATTERNS = [
  /lorem\s+ipsum/i,
  /dolor\s+sit\s+amet/i,
  /foo\s+bar/i,
  /test\s+company\s+inc/i,
  /acme\s+corp/i,
];

const PROHIBITED_ATTRIBUTIONS = [
  /usman\s+ali\s+worked\s+at\s+google/i,
  /usman\s+ali\s+founded\s+apple/i,
];

export function scanForFactualIntegrity(textOrObj: unknown): FactualScanResult {
  const violations: FactualViolation[] = [];
  const text = typeof textOrObj === 'string' ? textOrObj : JSON.stringify(textOrObj ?? '');

  for (const pattern of INVENTED_METRIC_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        rule: 'NO_UNSOURCED_PERCENTAGE_METRICS',
        snippet: match[0],
        explanation:
          'Quantified percentage impact metrics are prohibited without explicit source evidence.',
      });
    }
  }

  for (const pattern of LOREM_IPSUM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        rule: 'NO_PLACEHOLDER_OR_LOREM_TEXT',
        snippet: match[0],
        explanation: 'Placeholder or lorem ipsum text is not permitted in public projections.',
      });
    }
  }

  for (const pattern of PROHIBITED_ATTRIBUTIONS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        rule: 'NO_INVENTED_USMAN_ALI_FACTS',
        snippet: match[0],
        explanation:
          'Invented professional claims attributed to Usman Ali are strictly prohibited.',
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
