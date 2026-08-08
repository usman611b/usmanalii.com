/**
 * Feature flags — server-controlled, environment-aware.
 *
 * All V2+ flags default to false in V1.
 * Flags control route exposure, job scheduling and UI — NOT authorization.
 * Disabled features do not run background jobs or incur AI cost.
 *
 * Section 13 of Evolution and Compatibility Plan (05A).
 */
export interface FeatureFlags {
  // V1 — always enabled
  readonly manualGitHubLinks: boolean;

  // V2 — disabled in V1
  readonly githubConnection: boolean;
  readonly githubWebhookIngestion: boolean;
  readonly aiMetadataProposals: boolean;
  readonly capabilityAssessmentProposals: boolean;
  readonly resumeGeneration: boolean;

  // V3 — disabled in V1
  readonly jobParsing: boolean;
  readonly careerMatching: boolean;
  readonly semanticIndexing: boolean;
  readonly privateAskMyPortfolio: boolean;
  readonly publicAskMyPortfolio: boolean;
  readonly knowledgeGraph: boolean;
}

/** Default V1 flags — all V2+ features off. */
export const V1_DEFAULT_FLAGS: Readonly<FeatureFlags> = {
  manualGitHubLinks: true,

  // V2+
  githubConnection: false,
  githubWebhookIngestion: false,
  aiMetadataProposals: false,
  capabilityAssessmentProposals: false,
  resumeGeneration: false,

  // V3+
  jobParsing: false,
  careerMatching: false,
  semanticIndexing: false,
  privateAskMyPortfolio: false,
  publicAskMyPortfolio: false,
  knowledgeGraph: false,
} as const;

/**
 * Resolves feature flags for the current environment.
 * In V1, all flags are read from server config, not client.
 */
export function resolveFeatureFlags(
  envOverrides: Partial<FeatureFlags> = {},
): Readonly<FeatureFlags> {
  return { ...V1_DEFAULT_FLAGS, ...envOverrides };
}
