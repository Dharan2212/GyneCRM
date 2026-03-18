'use strict';

const knex = require('knex');
const config = require('../config/env');
const logger = require('../utils/logger');
const knexConfig = require('./knexfile');

// Support both flat and grouped config safely
const currentEnv = config.NODE_ENV || config.app?.env || 'development';
const envConfig = knexConfig[currentEnv];

if (!envConfig) {
  throw new Error(`No knex configuration found for environment: "${currentEnv}"`);
}

/** @type {import('knex').Knex & {query: Function, end: Function}} */
const db = knex(envConfig);

// Compatibility helpers for files written against node-postgres style APIs.
db.query = async (sql, params = []) => {
  const result = await db.raw(sql, params);
  // pg via knex returns { rows }, while some dialects can differ.
  if (result && Array.isArray(result.rows)) return { rows: result.rows };
  if (Array.isArray(result)) return { rows: result };
  return { rows: result?.rows || [] };
};

db.end = async () => db.destroy();

/**
 * Verifies the database connection by running a lightweight query.
 * Called during server startup.
 *
 * @returns {Promise<void>}
 * @throws {Error} if the database is unreachable
 */
const verifyConnection = async () => {
  try {
    await db.raw('SELECT 1');

    logger.info('Database connection established', {
      host: config.DB_HOST || config.db?.host,
      port: config.DB_PORT || config.db?.port,
      database: config.DB_ACTIVE_NAME || config.db?.activeName || config.DB_NAME,
      environment: currentEnv,
    });
  } catch (err) {
    logger.error('Database connection failed', {
      host: config.DB_HOST || config.db?.host,
      port: config.DB_PORT || config.db?.port,
      database: config.DB_ACTIVE_NAME || config.db?.activeName || config.DB_NAME,
      environment: currentEnv,
      error: err.message,
    });

    throw err;
  }
};

/**
 * Gracefully destroys the connection pool.
 * Called during shutdown and test teardown.
 *
 * @returns {Promise<void>}
 */
const destroyConnection = async () => {
  await db.destroy();

  logger.info('Database connection pool destroyed', {
    environment: currentEnv,
  });
};

module.exports = {
  db,
  verifyConnection,
  destroyConnection,
};