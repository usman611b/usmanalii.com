#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { rootDir } from './migration-integrity.mjs';

const baselinePath = join(rootDir, 'infrastructure', 'scripts', 'prettier-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const result = spawnSync(
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
const unformatted = (result.stdout ?? '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const violations = [];

for (const relative of unformatted) {
  const absolute = join(rootDir, relative);
  if (!existsSync(absolute)) continue;
  const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex');
  if (baseline.files[relative] !== actual) violations.push(relative);
}

if (violations.length) {
  console.error('New or modified files fail Prettier formatting:');
  for (const file of violations) console.error(`- ${file}`);
  process.exit(1);
}
console.log(
  `Incremental formatting verification passed; ${unformatted.length} unchanged legacy files are checksum-baselined.`,
);
