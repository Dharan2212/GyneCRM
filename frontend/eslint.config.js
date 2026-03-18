import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ─── React Hooks ──────────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ─── Code Quality ─────────────────────────────────────────────────
      'no-console':          ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars':      ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef':            'error',
      'prefer-const':        'warn',
      'no-var':              'error',
      'eqeqeq':              ['error', 'always'],
      'no-duplicate-imports':'error',
      'no-shadow':           'warn',

      // ─── Formatting (covered by Prettier, but document intent) ────────
      'no-trailing-spaces':  'warn',
      'no-multiple-empty-lines': ['warn', { max: 1 }],
    },
  },
];
