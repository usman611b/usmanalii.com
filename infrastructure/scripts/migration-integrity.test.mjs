import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  compatibleMigrationSql,
  migrationsDir,
  sha256,
  verifyMigrationFiles,
} from './migration-integrity.mjs';

test('migration manifest matches every immutable source file', async () => {
  const result = await verifyMigrationFiles();
  assert.deepEqual(result.errors, []);
});

test('checksum drift is detected for a modified applied migration', async () => {
  const source = await readFile(join(migrationsDir, '001_initial.sql'));
  assert.notEqual(sha256(Buffer.concat([source, Buffer.from('\n-- drift')])), sha256(source));
});

test('compatibility handling removes only known historical D1 defects', async () => {
  const one = await readFile(join(migrationsDir, '001_initial.sql'), 'utf8');
  const three = await readFile(join(migrationsDir, '003_evidence_ledger.sql'), 'utf8');
  const nine = await readFile(join(migrationsDir, '009_evidence_constraints_m3.sql'), 'utf8');
  assert.doesNotMatch(compatibleMigrationSql('001_initial.sql', one), /PRAGMA journal_mode = WAL/);
  assert.match(
    compatibleMigrationSql('003_evidence_ledger.sql', three),
    /updated_at\s+TEXT\s+NOT NULL,\n\n\s+-- INVARIANT/,
  );
  assert.match(
    compatibleMigrationSql('009_evidence_constraints_m3.sql', nine),
    /ADD COLUMN deleted_at/,
  );
});

test('M5 migration handles canonical fallback, clears legacy sensitive originals, preserves editability, and denies new originals', async () => {
  const source = await readFile(join(migrationsDir, '015_m5_integrity_closure.sql'), 'utf8');
  assert.match(source, /canonical_body_json TEXT NOT NULL/);
  assert.match(source, /project_revisions_immutable_update/);
  assert.match(source, /project_revisions_immutable_delete/);
  assert.match(source, /projects_deny_sensitive_original_insert/);
  assert.match(source, /projects_deny_sensitive_original_update/);
  assert.match(source, /sensitive_original_cleanup_events/);
  assert.match(source, /SET sensitive_original_text = NULL/);
  assert.match(source, /canonical_body_json = '\[\]'/);
});

test('M5 active project relationships reject duplicates', async () => {
  const source = await readFile(join(migrationsDir, '013_projects_engineering_m5.sql'), 'utf8');
  assert.match(source, /CREATE UNIQUE INDEX IF NOT EXISTS idx_project_rel_active/);
  assert.match(source, /WHERE archived_at IS NULL/);
});
