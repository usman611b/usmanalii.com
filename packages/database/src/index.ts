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
export type { MigrationRunner } from './migrations/runner.js';

// Migration utilities
export { runMigrations, getMigrationStatus } from './migrations/runner.js';

