import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const result = spawnSync(
  'pnpm',
  [
    '--dir',
    'apps/worker',
    'exec',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'usmanalii-local',
    '--local',
    '--config=../../infrastructure/wrangler/wrangler.toml',
  ],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
