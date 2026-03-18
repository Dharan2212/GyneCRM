'use strict';

require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const logger = require('./utils/logger');
const { verifyConnection, destroyConnection } = require('./db/connection');

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Normalize port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);
  if (Number.isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

/**
 * Bootstrap and start the HTTP server.
 */
async function start() {
  // ─── 1. Validate critical environment variables ──────────────────────────
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ─── 2. Verify database connectivity ────────────────────────────────────
  try {
    await verifyConnection();
    logger.info('Database connection verified.');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  // ─── 3. Build Express application ───────────────────────────────────────
  const app = createApp();

  // ─── 4. Create HTTP server ───────────────────────────────────────────────
  const server = http.createServer(app);
  const normalizedPort = normalizePort(PORT);

  server.listen(normalizedPort, HOST, () => {
    logger.info(`GyneCRM API server started`);
    logger.info(`  Environment : ${NODE_ENV}`);
    logger.info(`  Listening   : http://${HOST}:${normalizedPort}`);
    logger.info(`  Base path   : /api/v1`);
  });

  // ─── 5. Error event handlers ─────────────────────────────────────────────
  server.on('error', (error) => {
    if (error.syscall !== 'listen') throw error;
    const bind =
      typeof normalizedPort === 'string'
        ? `Pipe ${normalizedPort}`
        : `Port ${normalizedPort}`;

    switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // ─── 6. Graceful shutdown ─────────────────────────────────────────────────
  async function shutdown(signal) {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await destroyConnection();
        logger.info('Database pool closed.');
      } catch (err) {
        logger.error(`Error closing database pool: ${err.message}`);
      }
      process.exit(0);
    });

    // Force shutdown after 15 seconds if graceful fails
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 15_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ─── 7. Unhandled rejection / exception guard ────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`);
    // Do not crash in production — log and continue
    if (NODE_ENV !== 'production') process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });

  return server;
}

start();
