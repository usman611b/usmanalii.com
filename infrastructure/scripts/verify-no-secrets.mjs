#!/usr/bin/env node
/**
 * verify-no-secrets.mjs
 *
 * Node.js-based secret pattern scan for local use.
 * CI uses the gitleaks GitHub Action which handles cross-platform scanning.
 *
 * Scans source files for common secret patterns that should never be committed.
 * Security Threat Model §13, §14.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.json', '.toml', '.yaml', '.yml', '.env'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.wrangler', 'coverage', '.turbo', '.astro']);
const SKIP_FILES = new Set(['.dev.vars.example', 'verify-no-secrets.mjs']);

// Patterns that indicate real secrets — not placeholder values
const SECRET_PATTERNS = [
  { name: 'Cloudflare API Key', pattern: /\bCF_API_KEY\s*=\s*[A-Za-z0-9_-]{35,}\b/ },
  { name: 'Cloudflare API Token', pattern: /\bCF_API_TOKEN\s*=\s*[A-Za-z0-9_-]{35,}\b/ },
  { name: 'Bearer Token (real)', pattern: /Bearer\s+[A-Za-z0-9\-._~+/]{40,}/ },
  { name: 'GitHub Token', pattern: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'GitHub App Token', pattern: /ghs_[A-Za-z0-9]{36}/ },
  { name: 'Private Key Header', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  // Real email in OWNER_EMAIL (not the example placeholder)
  { name: 'Real OWNER_EMAIL', pattern: /OWNER_EMAIL\s*=\s*(?!your-owner-email@example\.com)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
];

let findings = 0;

function scanFile(filePath) {
  const fileName = filePath.split(/[/\\]/).pop();
  if (SKIP_FILES.has(fileName)) return;

  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const { name, pattern } of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          console.error(`❌ POTENTIAL SECRET: ${name}`);
          console.error(`   File: ${filePath}`);
          console.error(`   Line: ${i + 1}`);
          findings++;
        }
      }
    }
  } catch {
    // Binary file — skip
  }
}

function scanDir(dir) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (SCAN_EXTENSIONS.includes(extname(entry))) {
        scanFile(fullPath);
      }
    }
  } catch {
    // Permission error — skip
  }
}

console.log('🔍 Scanning for potential secrets in source files...\n');
scanDir(ROOT);

if (findings > 0) {
  console.error(`\n❌ Found ${findings} potential secret(s). Review and remove before committing.\n`);
  process.exit(1);
} else {
  console.log('✅ No secret patterns detected in source files.\n');
}
