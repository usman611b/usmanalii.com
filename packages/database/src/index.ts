/**
 * Database package — D1 repository interfaces and migration utilities.
 *
 * SECURITY (CRITICAL-02): Every repository method requires an authorization context.
 * Public methods expose only published/public data through allowlisted queries.
 * No method accepts owner_id from the client.
 *
 * Database Model §13 (D1 authorization model).
 */

// Repository interfaces (implementations in M3)
export type { ProfileRepository } from './repositories/profile.js';
export { D1ContentRepository } from './repositories/content.js';
export * from './repositories/evidence.js';
export * from './repositories/skills.js';
export * from './repositories/capabilities.js';
export * from './repositories/graph.js';
export * from './repositories/progression.js';
export * from './repositories/suggestions.js';
export * from './repositories/reconciliation.js';
export * from './repositories/projects.js';
export * from './repositories/engineering.js';
export * from './repositories/project-relationships.js';
export * from './repositories/github.js';
export type { MigrationRunner } from './migrations/runner.js';

// Migration utilities
export { runMigrations, getMigrationStatus } from './migrations/runner.js';
