'use strict';

/**
 * GyneCRM — Central Environment Configuration
 * Single source of truth for all environment variable names.
 *
 * LOCKED VARIABLE NAMES:
 *   JWT_SECRET              ← access token secret (NOT JWT_ACCESS_SECRET)
 *   JWT_REFRESH_SECRET      ← refresh token secret
 *   DB_HOST/DB_PORT/DB_NAME ← individual DB vars (NOT DATABASE_URL)
 *   DB_NAME_TEST            ← test database name
 *
 * This file intentionally exports:
 *   1) flat keys   → env.JWT_SECRET, env.DB_HOST, env.CORS_ORIGIN
 *   2) grouped keys → env.jwt.secret, env.db.host, env.s3.bucket, env.n8n.baseUrl
 *
 * Reason:
 * During stabilization, some existing files may still read grouped config
 * while newer files use flat config. This avoids breaking the app while
 * the rest of the codebase is normalized.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// ---------------------------------------------------------
// Load environment file
// ---------------------------------------------------------
const envFile =
  process.env.NODE_ENV === 'test'
    ? path.resolve(process.cwd(), '.env.test')
    : path.resolve(process.cwd(), '.env');

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
const required = (key) => {
  const val = process.env[key];
  if (val === undefined || val === null || String(val).trim() === '') {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return String(val).trim();
};

const optional = (key, defaultValue = '') => {
  const val = process.env[key];
  if (val === undefined || val === null || String(val).trim() === '') {
    return defaultValue;
  }
  return String(val).trim();
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
};

const toArray = (value, fallback = []) => {
  if (!value || String(value).trim() === '') return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// ---------------------------------------------------------
// Flat exported values
// ---------------------------------------------------------
const env = {
  // App
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: toInt(optional('PORT', '4000'), 4000),
  APP_NAME: optional('APP_NAME', 'GyneCRM'),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Database
  DB_HOST: optional('DB_HOST', 'localhost'),
  DB_PORT: toInt(optional('DB_PORT', '5432'), 5432),
  DB_USER: optional('DB_USER', 'postgres'),
  DB_PASSWORD: optional('DB_PASSWORD', ''),
  DB_NAME: optional('DB_NAME', 'gynecrm'),
  DB_NAME_TEST: optional('DB_NAME_TEST', 'gynecrm_test'),
  DB_POOL_MIN: toInt(optional('DB_POOL_MIN', '2'), 2),
  DB_POOL_MAX: toInt(optional('DB_POOL_MAX', '10'), 10),

  // JWT
  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Security / auth
  BCRYPT_ROUNDS: toInt(optional('BCRYPT_ROUNDS', '12'), 12),
  COOKIE_SECURE: toBool(optional('COOKIE_SECURE', ''), false),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: toInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 900000),
  RATE_LIMIT_MAX: toInt(optional('RATE_LIMIT_MAX', '100'), 100),
  AUTH_RATE_LIMIT_WINDOW_MS: toInt(optional('AUTH_RATE_LIMIT_WINDOW_MS', '900000'), 900000),
  AUTH_RATE_LIMIT_MAX: toInt(optional('AUTH_RATE_LIMIT_MAX', '10'), 10),

  // CORS
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', optional('CORS_ORIGIN', 'http://localhost:3000')),

  // S3 / object storage
  AWS_REGION: optional('AWS_REGION', 'ap-south-1'),
  AWS_ACCESS_KEY_ID: optional('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY', ''),
  S3_BUCKET_NAME: optional('S3_BUCKET_NAME', ''),
  S3_ENDPOINT: optional('S3_ENDPOINT', ''),
  S3_UPLOAD_URL_EXPIRY_SECONDS: toInt(optional('S3_UPLOAD_URL_EXPIRY_SECONDS', '900'), 900),
  S3_DOWNLOAD_URL_EXPIRY_SECONDS: toInt(optional('S3_DOWNLOAD_URL_EXPIRY_SECONDS', '1800'), 1800),
  MAX_FILE_SIZE_MB: toInt(optional('MAX_FILE_SIZE_MB', '20'), 20),

  // N8N
  N8N_BASE_URL: optional('N8N_BASE_URL', ''),
  N8N_WEBHOOK_SECRET: optional('N8N_WEBHOOK_SECRET', ''),

  // Optional monitoring
  SENTRY_DSN: optional('SENTRY_DSN', ''),
};

// ---------------------------------------------------------
// Computed flat helpers
// ---------------------------------------------------------
env.isProduction = env.NODE_ENV === 'production';
env.isDevelopment = env.NODE_ENV === 'development';
env.isTest = env.NODE_ENV === 'test';

env.DB_ACTIVE_NAME = env.isTest ? env.DB_NAME_TEST : env.DB_NAME;
env.CORS_ORIGIN_LIST = toArray(env.ALLOWED_ORIGINS, ['http://localhost:3000']);

// ---------------------------------------------------------
// Grouped compatibility aliases
// ---------------------------------------------------------
env.app = {
  env: env.NODE_ENV,
  port: env.PORT,
  name: env.APP_NAME,
  isProduction: env.isProduction,
  isDevelopment: env.isDevelopment,
  isTest: env.isTest,
};

env.db = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  name: env.DB_NAME,
  nameTest: env.DB_NAME_TEST,
  activeName: env.DB_ACTIVE_NAME,
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
  },
};

env.jwt = {
  secret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,

  // compatibility aliases
  accessTtlSeconds: env.JWT_EXPIRES_IN,
  refreshTtlSeconds: env.JWT_REFRESH_EXPIRES_IN,
};

env.cookie = {
  secure: env.isProduction || env.COOKIE_SECURE,
};

env.rateLimit = {
  global: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  auth: {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
  },
};

env.cors = {
  origin: env.CORS_ORIGIN,
  origins: env.CORS_ORIGIN_LIST,
  allowedOrigins: env.CORS_ORIGIN_LIST,
};

env.s3 = {
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  bucket: env.S3_BUCKET_NAME,
  endpoint: env.S3_ENDPOINT || null,
  uploadUrlExpirySeconds: env.S3_UPLOAD_URL_EXPIRY_SECONDS,
  downloadUrlExpirySeconds: env.S3_DOWNLOAD_URL_EXPIRY_SECONDS,
  maxFileSizeMb: env.MAX_FILE_SIZE_MB,
};

env.n8n = {
  baseUrl: env.N8N_BASE_URL,
  webhookSecret: env.N8N_WEBHOOK_SECRET,
};

env.logging = {
  level: env.LOG_LEVEL,
};

env.sentry = {
  dsn: env.SENTRY_DSN || null,
};

// ---------------------------------------------------------
// Runtime validation (light, stage-safe)
// ---------------------------------------------------------
if (!env.DB_HOST || !env.DB_ACTIVE_NAME) {
  throw new Error('[env] Database configuration is incomplete.');
}

if (!env.JWT_SECRET) {
  throw new Error('[env] JWT_SECRET is required.');
}

if (!env.JWT_REFRESH_SECRET) {
  throw new Error('[env] JWT_REFRESH_SECRET is required.');
}

module.exports = env;