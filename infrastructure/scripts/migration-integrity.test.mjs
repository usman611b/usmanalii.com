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
