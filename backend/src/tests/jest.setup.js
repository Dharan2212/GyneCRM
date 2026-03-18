'use strict';

/**
 * GyneCRM — Jest Global Setup
 * Loaded via setupFilesAfterEnv in package.json
 *
 * Corrections applied:
 *   - Uses JWT_SECRET  (NOT JWT_ACCESS_SECRET)
 *   - Uses DB_HOST / DB_PORT / DB_NAME_TEST  (NOT DATABASE_URL)
 *   - NODE_ENV forced to 'test' before any module is required
 */

const path = require('path');

// ── 1. Force test environment ────────────────────────────────
process.env.NODE_ENV = 'test';

// ── 2. Load .env.test ────────────────────────────────────────
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.test') });

// ── 3. Validate critical env vars are present ────────────────
const REQUIRED_TEST_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME_TEST',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',           // ← correct variable name
  'JWT_REFRESH_SECRET',
];

REQUIRED_TEST_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(
      `[jest.setup] Missing required test env variable: ${key}\n` +
      `Ensure .env.test is present at project root and contains all required keys.\n` +
      `Do NOT use DATABASE_URL or JWT_ACCESS_SECRET — see .env.test for correct names.`
    );
  }
});

// ── 4. Global test timeout ───────────────────────────────────
jest.setTimeout(30000);

// ── 5. Suppress non-error console output during tests ────────
global.console = {
  ...console,
  log:   jest.fn(),
  info:  jest.fn(),
  debug: jest.fn(),
  warn:  jest.fn(),
  error: console.error, // keep errors visible
};

// ── 6. Global afterAll guard ─────────────────────────────────
afterAll(async () => {
  // Allow open handles (DB pools, etc.) to close gracefully
  await new Promise((resolve) => setTimeout(resolve, 500));
});
