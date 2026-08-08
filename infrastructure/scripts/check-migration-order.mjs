#!/usr/bin/env node
/**
 * check-migration-order.mjs
 *
 * Verifies the canonical migration file list matches the files on disk.
 * Ensures no migration was removed, renamed or reordered.
 *
 * Database Model §16: "Never edit an applied migration."
 */

import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MIGRATIONS_DIR = join(ROOT, 'packages', 'database', 'migrations');

const CANONICAL_ORDER = [
  '001_initial.sql',
  '002_skills_capabilities.sql',
  '003_evidence_ledger.sql',
  '004_content_projects_activities.sql',
  '005_claims_integrations_proposals.sql',
  '006_engineering_records.sql',
];

console.log('🔍 Checking migration file order and completeness...\n');

let allPassed = true;

// Check all canonical files exist on disk
for (const file of CANONICAL_ORDER) {
  if (!existsSync(join(MIGRATIONS_DIR, file))) {
    console.error(`❌ Canonical migration missing from disk: ${file}`);
    allPassed = false;
  } else {
    console.log(`  ✓ ${file}`);
  }
}

// Check no extra migration files that aren't in canonical list
const diskFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const diskFile of diskFiles) {
  if (!CANONICAL_ORDER.includes(diskFile)) {
    console.warn(`  ⚠ Migration on disk not in canonical list: ${diskFile}`);
    console.warn('    Add it to CANONICAL_ORDER in this script and packages/database/src/migrations/runner.ts');
  }
}

if (!allPassed) {
  console.error('\n❌ Migration order check FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ Migration order check passed\n');
}
