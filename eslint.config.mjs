import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Root ESLint flat config.
 * Enforces:
 *  - TypeScript strict + type-checked rules
 *  - Package import boundaries (domain must not import CF-specific code)
 *  - No `any`, no `console.log` in source
 *  - No `owner_id` accepted from client request bodies (custom rule via no-restricted-syntax)
 */
export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.astro/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
    ],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript strict + type-checked for all TS files
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-level TS config for type-checking
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // General rules
  {
    rules: {
      // No untyped any
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // No console in source (use observability package)
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Enforce consistent imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // No non-null assertions without justification
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Security: never accept owner_id from client request bodies
      // This is enforced structurally via Zod schemas, but we also lint for it
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Property[key.name="owner_id"][parent.type="ObjectExpression"]',
          message:
            'SECURITY: owner_id must never be accepted from client request bodies. Use authenticated context only.',
        },
      ],
    },
  },

  // Import boundary rules — packages must not import across trust levels
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'packages/domain/src/**' },
        { type: 'contracts', pattern: 'packages/contracts/src/**' },
        { type: 'database', pattern: 'packages/database/src/**' },
        { type: 'authorization', pattern: 'packages/authorization/src/**' },
        { type: 'content', pattern: 'packages/content/src/**' },
        { type: 'design-system', pattern: 'packages/design-system/src/**' },
        { type: 'evidence', pattern: 'packages/evidence/src/**' },
        { type: 'search', pattern: 'packages/search/src/**' },
        { type: 'observability', pattern: 'packages/observability/src/**' },
        { type: 'test-fixtures', pattern: 'packages/test-fixtures/src/**' },
        { type: 'web', pattern: 'apps/web/src/**' },
        { type: 'worker', pattern: 'apps/worker/src/**' },
      ],
    },
    rules: {
      // Domain package is pure — no CF-specific, no app adapter imports
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'domain',
              disallow: ['database', 'authorization', 'web', 'worker'],
              message:
                'ARCH: packages/domain must not import application adapters or CF-specific packages.',
            },
            {
              from: 'web',
              disallow: ['database', 'authorization'],
              message:
                'ARCH: apps/web must not import database or authorization internals directly.',
            },
          ],
        },
      ],
    },
  },

  // JSX accessibility rules for React files in apps/web
  {
    files: ['apps/web/**/*.tsx', 'apps/web/**/*.jsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
  },

  // Relax some rules for test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': 'off',
    },
  },
);
