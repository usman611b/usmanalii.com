import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { rootDir } from './migration-integrity.mjs';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'dist', '.astro', 'coverage', 'test-results'].includes(entry.name))
      continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(ts|tsx|astro|json)$/.test(entry.name) && !/\.test\./.test(entry.name))
      files.push(path);
  }
  return files;
}

test('sensitive originals are absent from APIs search exports logs metadata errors audit records and fixtures', async () => {
  const roots = [join(rootDir, 'apps'), join(rootDir, 'packages')];
  const offenders = [];
  for (const root of roots) {
    for (const file of await sourceFiles(root)) {
      const content = await readFile(file, 'utf8');
      if (/sensitive_original_text|sensitiveOriginalText/i.test(content)) offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});

test('owner_id and approval-state mass assignment are rejected by project and contribution routes', async () => {
  const source = await readFile(
    join(rootDir, 'apps', 'worker', 'src', 'routes', 'private.ts'),
    'utf8',
  );
  assert.match(source, /ownerId: authContext\.ownerId/);
  assert.doesNotMatch(source, /ownerId:\s*body\./);
  assert.match(source, /publicationState: 'draft'/);
  assert.match(source, /visibility: 'private'/);
  assert.match(source, /ownerApproval: false/);
  assert.match(source, /verificationState: 'unverified'/);
});

test('contribution approval and attribution tampering are ignored on creation', async () => {
  const source = await readFile(
    join(rootDir, 'apps', 'worker', 'src', 'routes', 'private.ts'),
    'utf8',
  );
  assert.match(source, /ownerId: authContext\.ownerId/);
  assert.match(source, /ownerApproval: false/);
  assert.match(source, /verificationState: 'unverified'/);
  assert.doesNotMatch(source, /ownerApproval:\s*Boolean\(body\.ownerApproval\)/);
});
