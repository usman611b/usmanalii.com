import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace configuration.
 * Each package runs in the appropriate environment:
 *  - domain, contracts, authorization, evidence, search, observability, content → Node
 *  - database → @cloudflare/vitest-pool-workers (Wrangler local D1)
 *  - test-fixtures → Node (fixture validation only)
 *  - design-system → jsdom (React component tests)
 *  - web → jsdom
 *  - worker → @cloudflare/vitest-pool-workers
 */
export default defineWorkspace([
  // Pure domain packages — Node environment
  'packages/domain/vitest.config.ts',
  'packages/contracts/vitest.config.ts',
  'packages/authorization/vitest.config.ts',
  'packages/evidence/vitest.config.ts',
  'packages/search/vitest.config.ts',
  'packages/observability/vitest.config.ts',
  'packages/content/vitest.config.ts',
  'packages/test-fixtures/vitest.config.ts',

  // CF-dependent packages — Cloudflare pool workers
  'packages/database/vitest.config.ts',

  // UI packages — jsdom
  'packages/design-system/vitest.config.ts',

  // Application packages
  'apps/worker/vitest.config.ts',
]);
