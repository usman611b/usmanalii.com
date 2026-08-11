import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const PROHIBITED_PATTERNS = [
  { pattern: /\bTaskFlow\b/i, description: 'Fictional project name TaskFlow' },
  { pattern: /\bPR\s*#?1824\b/i, description: 'Fictional PR #1824' },
  { pattern: /\b42%\b/, description: 'Fictional 42% latency improvement claim' },
  { pattern: /\b99\.995%\b/, description: 'Fictional 99.995% uptime/processing claim' },
  { pattern: /\b87%\b/, description: 'Fictional 87% test coverage claim' },
  { pattern: /\bADR-004\b/i, description: 'Fictional ADR-004 project entry' },
  { pattern: /senior engineering impact/i, description: 'Unsubstantiated seniority claim' },
  { pattern: /Building reliable systems/i, description: 'Unsubstantiated branding claim' },
  { pattern: /Career Signal/i, description: 'Premature M8 widget Career Signal' },
  { pattern: /Evidence gaps/i, description: 'Premature M8 widget Evidence gaps' },
  { pattern: /Next learning direction/i, description: 'Premature M8 widget Next learning direction' },
];

const IGNORE_DIRS = ['.git', 'node_modules', 'dist', '.astro', 'build', '.gemini'];
const TARGET_EXTS = ['.astro', '.tsx', '.ts', '.jsx', '.js'];
const EXCLUDE_FILE_PATTERNS = [/\.test\.[mt]?js$/, /\.test\.ts$/, /test-fixtures/, /verify-factual-integrity\.mjs$/];

let violationsCount = 0;

function scanDir(dirPath) {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue;
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      if (!TARGET_EXTS.includes(extname(fullPath))) continue;
      if (EXCLUDE_FILE_PATTERNS.some((p) => p.test(fullPath))) continue;

      const content = readFileSync(fullPath, 'utf8');
      for (const { pattern, description } of PROHIBITED_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`❌ FACTUAL INTEGRITY VIOLATION in ${fullPath}:`);
          console.error(`   Found prohibited pattern: ${description}`);
          violationsCount++;
        }
      }
    }
  }
}

console.log('🔍 Running Factual Integrity Scanner across production code...');
scanDir(join(process.cwd(), 'apps/web/src'));
scanDir(join(process.cwd(), 'packages'));

if (violationsCount > 0) {
  console.error(`\n🚨 Factual Integrity Check FAILED with ${violationsCount} violation(s).`);
  process.exit(1);
} else {
  console.log('✅ Factual Integrity Check PASSED! Zero fictional facts found in production code.');
}
