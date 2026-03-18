'use strict';

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

/**
 * Knex configuration file.
 *
 * Loaded by:
 * 1. Application runtime via src/db/connection.js
 * 2. Knex CLI for migrate/seed commands
 *
 * Paths are resolved absolutely from this file location so they work
 * regardless of the current working directory.
 */

const baseConnection = {
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8',
};

const migrationsDir = path.resolve(__dirname, 'migrations');
const seedsDir = path.resolve(__dirname, 'seeds');

/** @type {import('knex').Knex.Config} */
const baseConfig = {
  client: 'pg',
  migrations: {
    directory: migrationsDir,
    extension: 'js',
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: seedsDir,
    loadExtensions: ['.js'],
  },
};

/**
 * Test database name resolution:
 * 1. Use DB_NAME_TEST if explicitly provided.
 * 2. Fall back to DB_NAME + '_test'
 */
const testDbName =
  process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'gynecrm'}_test`;

/** @type {{ [env: string]: import('knex').Knex.Config }} */
const knexConfig = {
  development: {
    ...baseConfig,
    connection: {
      ...baseConnection,
      database: process.env.DB_NAME || 'gynecrm',
    },
    pool: {
      min: Number.parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    debug: false,
  },

  test: {
    ...baseConfig,
    connection: {
      ...baseConnection,
      database: testDbName,
    },
    pool: {
      min: 1,
      max: 5,
    },
    debug: false,
  },

  production: {
    ...baseConfig,
    connection: {
      ...baseConnection,
      database: process.env.DB_NAME || 'gynecrm',
      ssl: { rejectUnauthorized: true },
    },
    pool: {
      min: Number.parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    debug: false,
  },
};

module.exports = knexConfig;