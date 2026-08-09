import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(scriptDir, '..', '..');
export const migrationsDir = join(rootDir, 'packages', 'database', 'migrations');
export const manifestPath = join(migrationsDir, 'manifest.json');

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

export async function verifyMigrationFiles() {
  const manifest = await loadManifest();
  const errors = [];
  for (const [filename, expected] of Object.entries(manifest.migrations)) {
    const content = await readFile(join(migrationsDir, filename));
    const actual = sha256(content);
    if (actual !== expected) errors.push(`${filename}: expected ${expected}, received ${actual}`);
  }
  return { manifest, errors };
}

const evidenceConstraint = `  -- INVARIANT: Exactly one target (CHECK enforces sum = 1)
  CONSTRAINT evidence_link_single_target CHECK (
    (capability_id    IS NOT NULL) +
    (claim_id         IS NOT NULL) +
    (project_id       IS NOT NULL) +
    (content_item_id  IS NOT NULL) +
    (artifact_id      IS NOT NULL) = 1
  ),

`;

export function compatibleMigrationSql(filename, source) {
  if (filename === '001_initial.sql') {
    return source.replace(
      'PRAGMA journal_mode = WAL;',
      '-- compatibility: D1 controls journaling mode',
    );
  }
  if (filename === '003_evidence_ledger.sql') {
    const withoutConstraint = source.replace(evidenceConstraint, '');
    return withoutConstraint.replace(
      '  updated_at      TEXT    NOT NULL\n);\n\n-- Evidence edges by target',
      `  updated_at      TEXT    NOT NULL,\n\n${evidenceConstraint.trimEnd().replace(/,$/, '')}\n);\n\n-- Evidence edges by target`,
    );
  }
  if (filename === '009_evidence_constraints_m3.sql') {
    return `ALTER TABLE evidence_items ADD COLUMN deleted_at TEXT;\nCREATE INDEX IF NOT EXISTS idx_evidence_items_deleted ON evidence_items(owner_id, deleted_at);\n\n${source}`;
  }
  return source;
}
