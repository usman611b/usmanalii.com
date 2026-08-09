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
  '010_reconciliation_queue_m3.sql',
  '011_skills_capabilities_m4.sql',
  '012_m4_final_gate_closure.sql',
] as const;

export type MigrationFile = (typeof MIGRATION_FILES)[number];

/**
 * Placeholder implementations — full D1-backed implementation in M3.
 * These stubs allow the migration runner script to work in M0.
 */
interface D1MigrationDatabase {
  prepare(sql: string): { all<T>(): Promise<{ results?: T[] }> };
  exec(sql: string): Promise<unknown>;
}

export interface MigrationSource {
  readonly filename: MigrationFile;
  readonly sql: string;
}

export async function runMigrations(
  db: D1MigrationDatabase,
  sources: readonly MigrationSource[] = [],
): Promise<readonly MigrationStatus[]> {
  const supplied = new Map(sources.map((source) => [source.filename, source.sql]));
  const applied = new Set((await getMigrationStatus(db)).map((status) => status.version));
  for (const filename of MIGRATION_FILES) {
    const version = Number(filename.slice(0, 3));
    if (applied.has(version)) continue;
    const sql = supplied.get(filename);
    if (!sql) throw new Error(`MIGRATION_SOURCE_MISSING: ${filename}`);
    await db.exec(sql);
  }
  return getMigrationStatus(db);
}

export async function getMigrationStatus(
  db: D1MigrationDatabase,
): Promise<readonly MigrationStatus[]> {
  let result: { results?: Record<string, unknown>[] };
  try {
    result = await db
      .prepare('SELECT version, description, applied_at FROM schema_versions ORDER BY version ASC')
      .all<Record<string, unknown>>();
  } catch (error) {
    if (/no such table: schema_versions/i.test(String(error))) return [];
    throw error;
  }
  return (result.results ?? []).map((row) => ({
    version: Number(row.version),
    description: String(row.description),
    appliedAt: String(row.applied_at),
  }));
}
