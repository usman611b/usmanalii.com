#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
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
  await applyRange(freshStore, files);
  executeD1(freshStore, ['--command=SELECT COUNT(*) AS version_count FROM schema_versions']);
  console.log(`Fresh D1 verification passed: ${files.length} migrations applied.`);

  const upgradeStore = join(tempRoot, 'upgrade-from-m3');
  await applyRange(upgradeStore, files.slice(0, 8));
  await applyRange(upgradeStore, files.slice(8));
  executeD1(upgradeStore, ['--command=SELECT COUNT(*) AS version_count FROM schema_versions']);
  console.log(
    'Upgrade-path verification passed: historical M3 baseline (001-008) upgraded through 012.',
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
