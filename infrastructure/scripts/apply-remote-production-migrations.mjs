import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  compatibleMigrationSql,
  migrationsDir,
  rootDir,
  verifyMigrationFiles,
} from './migration-integrity.mjs';

const PRODUCTION_DATABASE = 'usmanalii-production';
const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(`--confirm=${PRODUCTION_DATABASE}`);
const configOption = process.argv.find((value) => value.startsWith('--config='));
const configValue =
  configOption?.slice('--config='.length) ??
  'infrastructure/wrangler/wrangler.production.toml';
const configPath = isAbsolute(configValue) ? configValue : resolve(rootDir, configValue);
const config = await readFile(configPath, 'utf8');

assert.match(config, /name\s*=\s*"usmanalii-worker"/);
assert.match(config, /main\s*=\s*"\.\.\/\.\.\/apps\/worker\/src\/index\.ts"/);
assert.match(config, /\[env\.production\]/);
assert.match(config, /usmanalii\.com\/api\/\*/);
assert.match(config, /database_name\s*=\s*"usmanalii-production"/);
assert.doesNotMatch(config, /\[env\.staging\]/);
assert.doesNotMatch(config, /usmanalii-staging|usmanalii-artifacts-staging/);
assert.doesNotMatch(config, /REPLACE_IN_CF_DASHBOARD/);

const { manifest, errors } = await verifyMigrationFiles();
assert.deepEqual(errors, [], `Migration checksum drift:\n${errors.join('\n')}`);

const sources = await Promise.all(
  Object.keys(manifest.migrations)
    .sort()
    .map(async (filename) => ({
      filename,
      sql: compatibleMigrationSql(filename, await readFile(join(migrationsDir, filename), 'utf8')),
    })),
);

if (apply) {
  assert.equal(confirmed, true, `Remote execution requires --confirm=${PRODUCTION_DATABASE}`);
}

const wranglerCli = resolve(rootDir, 'apps/worker/node_modules/wrangler/bin/wrangler.js');
const wrangler = (args, allowFailure = false) => {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      PRODUCTION_DATABASE,
      '--remote',
      `--config=${configPath}`,
      ...args,
    ],
    { cwd: rootDir, encoding: 'utf8', windowsHide: true },
  );
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Wrangler D1 execution failed');
  }
  return result;
};

function collectVersions(value, versions = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectVersions(item, versions);
  } else if (value && typeof value === 'object') {
    if ('version' in value && Number.isInteger(Number(value.version))) {
      versions.push(Number(value.version));
    }
    for (const item of Object.values(value)) collectVersions(item, versions);
  }
  return versions;
}

const status = wrangler(
  ['--command=SELECT version FROM schema_versions ORDER BY version ASC', '--json'],
  true,
);
let applied = [];
if (status.status === 0) {
  applied = [...new Set(collectVersions(JSON.parse(status.stdout)))].sort((a, b) => a - b);
} else if (!/no such table:\s*schema_versions/i.test(`${status.stdout}\n${status.stderr}`)) {
  throw new Error(status.stderr || status.stdout || 'Could not inspect production migration state');
}

for (let index = 0; index < applied.length; index += 1) {
  assert.equal(applied[index], index + 1, 'Production schema_versions contains a gap');
}

const pending = sources.filter(({ filename }) => !applied.includes(Number(filename.slice(0, 3))));
console.log(
  `Remote production schema has ${applied.length} applied migrations; pending: ${pending.map(({ filename }) => filename).join(', ') || 'none'}.`,
);
if (!apply) process.exit(0);

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'usmanalii-production-migrations-'));
try {
  for (const source of pending) {
    const target = join(temporaryDirectory, basename(source.filename));
    await writeFile(target, source.sql, 'utf8');
    wrangler([`--file=${target}`]);
    console.log(`Applied checksum-approved production migration ${source.filename}.`);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log('Remote production migration execution completed.');
