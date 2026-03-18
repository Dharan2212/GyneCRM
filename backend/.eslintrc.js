'use strict';

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
  },
  extends: ['eslint:recommended'],
  rules: {
    // Error prevention
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
    'no-implicit-coercion': 'error',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-promise-executor-return': 'error',

    // Style consistency
    'consistent-return': 'error',
    'no-else-return': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-destructuring': ['warn', { object: true, array: false }],
    'prefer-template': 'error',

    // Node.js
    'handle-callback-err': 'error',
    'no-process-exit': 'error',
  },
  overrides: [
    {
      files: ['src/tests/**/*.js'],
      rules: {
        'no-unused-vars': 'warn',
        'consistent-return': 'off',
      },
    },
  ],
};
