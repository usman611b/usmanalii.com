import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compatibleMigrationSql, migrationsDir, rootDir, verifyMigrationFiles } from './migration-integrity.mjs';

const persistDir = join(rootDir, '.wrangler', 'codex-local-dev');
const preparedDir = join(persistDir, 'prepared-migrations');

if (existsSync(persistDir)) {
  console.error(`Refusing to overwrite the existing local store: ${persistDir}`);
  process.exit(1);
}

const { manifest, errors } = await verifyMigrationFiles();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

await mkdir(preparedDir, { recursive: true });
for (const filename of Object.keys(manifest.migrations).sort()) {
  const source = await readFile(join(migrationsDir, filename), 'utf8');
  const prepared = join(preparedDir, filename);
  await writeFile(prepared, compatibleMigrationSql(filename, source), 'utf8');
  const result = spawnSync(
    'pnpm',
    ['--filter', '@usmanalii/worker', 'exec', 'wrangler', 'd1', 'execute', 'DB', '--env', 'local', '--local', `--persist-to=${persistDir}`, `--file=${prepared}`],
    { cwd: rootDir, encoding: 'utf8', shell: true },
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
}
console.log(`Initialized isolated local D1 store through migration ${Object.keys(manifest.migrations).sort().at(-1)}.`);
