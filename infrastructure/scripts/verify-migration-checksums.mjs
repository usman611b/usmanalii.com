#!/usr/bin/env node
import { sha256, verifyMigrationFiles } from './migration-integrity.mjs';

const { manifest, errors } = await verifyMigrationFiles();
if (errors.length) {
  console.error('Migration checksum drift detected:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const known = manifest.migrations['001_initial.sql'];
if (sha256(Buffer.from('intentionally modified migration')) === known) {
  console.error('Checksum drift self-test failed to detect modified content.');
  process.exit(1);
}

console.log(
  `Migration checksum verification passed for ${Object.keys(manifest.migrations).length} files.`,
);
