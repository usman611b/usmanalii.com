#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {
  compatibleMigrationSql,
  loadManifest,
  migrationsDir,
  rootDir,
  verifyMigrationFiles,
} from './migration-integrity.mjs';

const workerDir = join(rootDir, 'apps', 'worker');
const configPath = join(rootDir, 'infrastructure', 'wrangler', 'wrangler.toml');
const wranglerCli = join(workerDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function executeD1(persistTo, args) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      'usmanalii-local',
      `--config=${configPath}`,
      '--local',
      `--persist-to=${persistTo}`,
      ...args,
    ],
    { cwd: workerDir, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(
      `D1 execution failed with exit code ${result.status}: ${result.error?.message ?? 'unknown spawn error'}`,
    );
  }
  return result.stdout;
}

function executeD1ExpectFailure(persistTo, args) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      'usmanalii-local',
      `--config=${configPath}`,
      '--local',
      `--persist-to=${persistTo}`,
      ...args,
    ],
    { cwd: workerDir, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, 'Expected D1 command to fail closed');
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

async function prepareCompatibleFiles(tempRoot) {
  const manifest = await loadManifest();
  const files = [];
  for (const filename of Object.keys(manifest.migrations)) {
    const source = await readFile(join(migrationsDir, filename), 'utf8');
    const target = join(tempRoot, filename);
    await writeFile(target, compatibleMigrationSql(filename, source), 'utf8');
    files.push({ filename, target });
  }
  return files;
}

async function applyRange(persistTo, files) {
  for (const file of files) executeD1(persistTo, [`--file=${file.target}`]);
}

const integrity = await verifyMigrationFiles();
if (integrity.errors.length)
  throw new Error(`Migration checksum drift:\n${integrity.errors.join('\n')}`);

const tempRoot = await mkdtemp(join(tmpdir(), 'portfolio-migrations-'));
try {
  const files = await prepareCompatibleFiles(tempRoot);

  const freshStore = join(tempRoot, 'fresh');
  await applyRange(freshStore, files.slice(0, 15));
  executeD1(freshStore, ['--command=SELECT COUNT(*) AS version_count FROM schema_versions']);
  await applyRange(freshStore, files.slice(15));
  executeD1(freshStore, ['--command=SELECT COUNT(*) AS version_count FROM schema_versions']);
  console.log(`Fresh D1 verification passed: ${files.length} migrations applied.`);
  console.log(
    `M6 upgrade-path verification passed: immutable M5 baseline (001-015) upgraded through ${files.at(-1)?.filename}.`,
  );

  const legacyStore = join(tempRoot, 'legacy-m5-data');
  await applyRange(legacyStore, files.slice(0, 14));
  const seedPath = join(tempRoot, 'legacy-seed.sql');
  await writeFile(
    seedPath,
    `INSERT INTO projects (id, owner_id, title, slug, created_at, updated_at, sensitive_original_text)
VALUES ('legacy-project', 'owner-1', 'Legacy', 'legacy', datetime('now'), datetime('now'), 'legacy-secret');
INSERT INTO project_revisions (id, project_id, owner_id, revision_no, case_study_snapshot, revision_note, created_at, created_by)
VALUES
('rev-valid', 'legacy-project', 'owner-1', 1, '[{"type":"paragraph","text":"valid"}]', 'valid', datetime('now'), 'owner-1'),
('rev-empty', 'legacy-project', 'owner-1', 2, '', 'empty', datetime('now'), 'owner-1'),
('rev-invalid', 'legacy-project', 'owner-1', 3, 'legacy markdown', 'invalid', datetime('now'), 'owner-1'),
('rev-object', 'legacy-project', 'owner-1', 4, '{"type":"paragraph"}', 'object', datetime('now'), 'owner-1');`,
    'utf8',
  );
  executeD1(legacyStore, [`--file=${seedPath}`]);
  await applyRange(legacyStore, files.slice(14));
  const legacyResult = executeD1(legacyStore, [
    "--command=SELECT COUNT(*) AS valid_json_count FROM project_revisions WHERE id = 'rev-valid' AND canonical_body_json = case_study_snapshot; SELECT COUNT(*) AS safe_empty_count FROM project_revisions WHERE id IN ('rev-empty', 'rev-invalid', 'rev-object') AND canonical_body_json = '[]'; SELECT COUNT(*) AS cleared_count FROM projects WHERE id = 'legacy-project' AND sensitive_original_text IS NULL; SELECT COUNT(*) AS quarantine_count FROM sensitive_original_cleanup_events WHERE project_id = 'legacy-project'; UPDATE projects SET title = 'Normally editable' WHERE id = 'legacy-project'; SELECT COUNT(*) AS updated_count FROM projects WHERE id = 'legacy-project' AND title = 'Normally editable';",
  ]);
  for (const expected of [
    /valid_json_count[\s\S]*1/,
    /safe_empty_count[\s\S]*3/,
    /cleared_count[\s\S]*1/,
    /quarantine_count[\s\S]*1/,
    /updated_count[\s\S]*1/,
  ])
    assert.match(legacyResult, expected);
  const rejectedUpdate = executeD1ExpectFailure(legacyStore, [
    "--command=UPDATE projects SET sensitive_original_text = 'new-secret' WHERE id = 'legacy-project'",
  ]);
  assert.match(rejectedUpdate, /sensitive originals are not stored/i);
  const rejectedInsert = executeD1ExpectFailure(legacyStore, [
    "--command=INSERT INTO projects (id, owner_id, title, slug, created_at, updated_at, sensitive_original_text) VALUES ('new-project', 'owner-1', 'New', 'new', datetime('now'), datetime('now'), 'new-secret')",
  ]);
  assert.match(rejectedInsert, /sensitive originals are not stored/i);
  console.log(
    'Migration 015 legacy-data verification passed: valid/empty/invalid snapshots, cleanup provenance, normal updates, and new-write rejection.',
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
