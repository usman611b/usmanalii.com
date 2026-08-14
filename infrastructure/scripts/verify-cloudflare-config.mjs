import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { rootDir } from './migration-integrity.mjs';

const files = {
  worker: join(rootDir, 'apps', 'worker', 'wrangler.toml'),
  infrastructure: join(rootDir, 'infrastructure', 'wrangler', 'wrangler.toml'),
  stagingTemplate: join(rootDir, 'infrastructure', 'wrangler', 'wrangler.staging.toml.example'),
  guide: join(rootDir, 'docs', 'M7_5_STAGING_DEPLOYMENT_GUIDE.md'),
};

const entries = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([name, path]) => [name, await readFile(path, 'utf8')]),
  ),
);

function environmentSection(source, environment) {
  const start = source.indexOf(`[env.${environment}]`);
  assert.notEqual(start, -1, `Missing ${environment} environment`);
  const next = [...source.matchAll(/^\[env\.(?:local|preview|staging|production)\]\s*$/gm)]
    .map((match) => match.index)
    .find((index) => index > start);
  return source.slice(start, next ?? source.length);
}

for (const name of ['worker', 'infrastructure']) {
  const staging = environmentSection(entries[name], 'staging');
  const production = environmentSection(entries[name], 'production');

  assert.match(staging, /staging\.usmanalii\.com\/api\/\*/);
  assert.doesNotMatch(staging, /\[env\.staging\.triggers\]|crons\s*=/);
  assert.match(staging, /database_name\s*=\s*"usmanalii-staging"/);
  assert.equal(
    (staging.match(/bucket_name\s*=\s*"usmanalii-artifacts-staging"/g) ?? []).length,
    3,
    `${name} must bind all compatibility aliases to the one private staging bucket`,
  );

  assert.doesNotMatch(production, /staging/i, `${name} production references staging`);
  assert.match(production, /usmanalii\.com\/api\/\*/);
  assert.match(production, /crons\s*=\s*\["0 0 \* \* \*"\]/);
  assert.match(production, /database_name\s*=\s*"usmanalii-production"/);
}

assert.match(entries.stagingTemplate, /main\s*=\s*"\.\.\/\.\.\/apps\/worker\/src\/index\.ts"/);
assert.match(entries.stagingTemplate, /staging\.usmanalii\.com\/api\/\*/);
assert.match(entries.stagingTemplate, /database_id\s*=\s*"STAGING_DB_ID_HERE"/);
assert.doesNotMatch(entries.stagingTemplate, /\[env\.staging\.triggers\]|crons\s*=/);
assert.equal(
  (entries.stagingTemplate.match(/bucket_name\s*=\s*"usmanalii-artifacts-staging"/g) ?? []).length,
  3,
);

assert.doesNotMatch(
  entries.guide,
  /^\s*(?:pnpm|npx).*d1 migrations apply/gm,
  'The staging guide must not bypass checksum-gated compatibility execution',
);
assert.match(entries.guide, /apply-remote-staging-migrations\.mjs/);

console.log('Cloudflare environment isolation and staging deployment configuration verified.');
