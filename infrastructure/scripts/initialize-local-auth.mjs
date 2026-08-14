import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rootDir } from './migration-integrity.mjs';

const target = join(rootDir, 'apps', 'worker', '.dev.vars');
if (existsSync(target)) {
  console.error(`Refusing to overwrite existing secrets file: ${target}`);
  process.exit(1);
}
const token = randomBytes(32).toString('base64url');
await writeFile(target, `# Localhost only. Never commit this file.\nLOCAL_OWNER_TOKEN=${token}\n`, { encoding: 'utf8', mode: 0o600 });
console.log('Created apps/worker/.dev.vars with a random local owner token.');
console.log('Open that ignored file locally and copy LOCAL_OWNER_TOKEN into the localhost login page.');
