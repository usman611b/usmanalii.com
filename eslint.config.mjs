import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Root ESLint flat config.
 * Enforces:
 *  - TypeScript strict rules
 *  - Package import boundaries (domain must not import CF-specific code)
 *  - Security: no `owner_id` accepted from client request bodies
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
      'infrastructure/scripts/**',
    ],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript recommended for all TS files
  ...tseslint.configs.recommended,

  // General rules
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Property[key.name="owner_id"][parent.type="ObjectExpression"]',
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
);
