#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { rootDir } from './migration-integrity.mjs';

const prettier = spawnSync(
  'pnpm',
  [
    'exec',
    'prettier',
    '--list-different',
    '**/*.{ts,tsx,astro,json,md,yaml,yml,css}',
    '--ignore-path',
    '.prettierignore',
  ],
  { cwd: rootDir, encoding: 'utf8', shell: process.platform === 'win32' },
);
const changed = new Set(
  spawnSync('git', ['status', '--short'], { cwd: rootDir, encoding: 'utf8' })
    .stdout.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, '/')),
);
const files = prettier.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const changedAndUnformatted = files.filter((file) => changed.has(file));
if (changedAndUnformatted.length) {
  console.error(
    `Refusing to baseline changed unformatted files:\n${changedAndUnformatted.join('\n')}`,
  );
  process.exit(1);
}
const hashes = Object.fromEntries(
  files.map((file) => [
    file,
    createHash('sha256')
      .update(readFileSync(join(rootDir, file)))
      .digest('hex'),
  ]),
);
writeFileSync(
  join(rootDir, 'infrastructure', 'scripts', 'prettier-baseline.json'),
  `${JSON.stringify({ formatVersion: 1, files: hashes }, null, 2)}\n`,
);
console.log(`Recorded ${files.length} unchanged legacy formatting exceptions.`);
