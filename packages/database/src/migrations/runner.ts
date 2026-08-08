/**
 * Migration runner interface and utilities.
 *
 * Database Model §16 (Migrations):
 *  - Store numbered migrations in Git
 *  - Apply locally, then staging, then production
 *  - Never edit an applied migration
 *  - Keep schema version in the database and every export package
 */

export interface MigrationStatus {
  readonly version: number;
  readonly description: string;
  readonly appliedAt: string;
}

export interface MigrationRunner {
  /**
   * Runs all pending migrations in order.
   * Idempotent — skips already-applied migrations by checking schema_versions.
   */
  runAll(): Promise<readonly MigrationStatus[]>;

  /**
   * Gets the current migration status.
   */
  getStatus(): Promise<readonly MigrationStatus[]>;

  /**
   * Verifies all migrations can run from a fresh empty database.
   * Used in CI to confirm migration reproducibility.
   */
  verifyFreshInstall(): Promise<boolean>;
}

/**
 * Ordered list of migration files.
 * This list determines the canonical migration order.
 * Never remove or reorder entries — only append.
 */
export const MIGRATION_FILES = [
  '001_initial.sql',
  '002_skills_capabilities.sql',
  '003_evidence_ledger.sql',
  '004_content_projects_activities.sql',
  '005_claims_integrations_proposals.sql',
  '006_engineering_records.sql',
  '007_embargo_until.sql',
  '008_evidence_ledger_m3.sql',
  '009_evidence_constraints_m3.sql',
] as const;

export type MigrationFile = (typeof MIGRATION_FILES)[number];

/**
 * Placeholder implementations — full D1-backed implementation in M3.
 * These stubs allow the migration runner script to work in M0.
 */
export async function runMigrations(_db: unknown): Promise<readonly MigrationStatus[]> {
  throw new Error('runMigrations: D1 implementation pending M3.');
}

export async function getMigrationStatus(_db: unknown): Promise<readonly MigrationStatus[]> {
  throw new Error('getMigrationStatus: D1 implementation pending M3.');
}
