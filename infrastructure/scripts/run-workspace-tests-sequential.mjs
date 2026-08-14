import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

import { rootDir } from './migration-integrity.mjs';

const workspaceGroups = ['apps', 'packages', 'infrastructure'];
const projects = [];

for (const group of workspaceGroups) {
  const groupDirectory = join(rootDir, group);
  for (const entry of await readdir(groupDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(groupDirectory, entry.name);
    try {
      const packageJson = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (packageJson.scripts?.test) {
        projects.push({ directory, name: packageJson.name ?? relative(rootDir, directory) });
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

projects.sort((left, right) => left.name.localeCompare(right.name));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

for (const project of projects) {
  console.log(`\n[sequential-test] ${project.name}`);
  const result = spawnSync(pnpm, ['--dir', project.directory, 'test'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nSequential workspace tests passed for ${projects.length} projects.`);
