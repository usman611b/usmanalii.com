import type { EvidenceItemEntity, EvidenceStrength } from '@usmanalii/domain';

export interface EvidenceStrengthEvaluation {
  classification: EvidenceStrength;
  explanation: string;
  contributingFactors: readonly string[];
  eligibleEvidenceCount: number;
}

/**
 * Deterministically evaluates evidence strength for a skill or capability.
 *
 * Rules:
 *  - Disputed, revoked, archived, deleted, or embargoed evidence items are EXCLUDED.
 *  - Evidence quantity ALONE cannot produce 'strong_evidence' without source verification & inspectability.
 *  - Never produces a numeric percentage or score for public display.
 */
export function evaluateEvidenceStrength(
  items: readonly EvidenceItemEntity[],
  now: Date = new Date(),
): EvidenceStrengthEvaluation {
  // 1. Filter eligible evidence items
  const eligible = items.filter((item) => {
    if (item.visibility !== 'public') return false;
    if (item.archivedAt !== null) return false;
    if (
      item.verificationState === 'disputed' ||
      item.verificationState === 'revoked' ||
      item.verificationState === 'archived'
    ) {
      return false;
    }
    if (item.embargoUntil !== null && new Date(item.embargoUntil) > now) return false;
    return true;
  });

  if (eligible.length === 0) {
    return {
      classification: 'limited_evidence',
      explanation: 'No public eligible evidence items are associated with this record.',
      contributingFactors: [],
      eligibleEvidenceCount: 0,
    };
  }

  const factors: string[] = [];
  let score = 0;

  // Factor 1: Source Verification
  const sourceVerifiedCount = eligible.filter(
    (i) => i.verificationState === 'source_verified',
  ).length;
  if (sourceVerifiedCount > 0) {
    score += 2;
    factors.push(`${sourceVerifiedCount} source-verified evidence item(s)`);
  } else {
    score += 1;
    factors.push('Owner-verified evidence items');
  }

  // Factor 2: Recency (demonstrated/captured within last 180 days)
  const hundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const recentCount = eligible.filter((i) => {
    const timestamp = i.occurredAt || i.capturedAt;
    return timestamp && new Date(timestamp) >= hundredEightyDaysAgo;
  }).length;

  if (recentCount > 0) {
    score += 1;
    factors.push('Demonstrated within the last 180 days');
  }

  // Factor 3: Context Diversity (distinct providers)
  const providers = new Set(eligible.map((i) => i.provider || i.sourceType).filter(Boolean));
  if (providers.size >= 2) {
    score += 1;
    factors.push(`Context diversity across ${providers.size} distinct sources/providers`);
  }

  // Factor 4: Outcome Inspectability (durable canonical URL)
  const inspectableCount = eligible.filter((i) => Boolean(i.canonicalLocator)).length;
  if (inspectableCount > 0) {
    score += 1;
    factors.push(`${inspectableCount} inspectable locator link(s)`);
  }

  // Determine qualitative classification
  let classification: EvidenceStrength = 'limited_evidence';
  if (score >= 5 && sourceVerifiedCount > 0 && inspectableCount > 0) {
    classification = 'strong_evidence';
  } else if (score >= 4) {
    classification = 'established_evidence';
  } else if (score >= 2) {
    classification = 'emerging_evidence';
  }

  return {
    classification,
    explanation: `Evidence strength classified as ${classification.replace('_', ' ')} based on ${factors.join(', ')}.`,
    contributingFactors: factors,
    eligibleEvidenceCount: eligible.length,
  };
}
