'use strict';

const { Router } = require('express');
const { db } = require('../db/connection');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /api/v1/health
 *
 * Liveness + readiness check endpoint.
 * Used by:
 *   - Docker HEALTHCHECK
 *   - AWS ALB / DigitalOcean health probes
 *   - Uptime monitoring (UptimeRobot, Pingdom, etc.)
 *
 * Response (healthy):
 * HTTP 200
 * {
 *   "success": true,
 *   "message": "Service is healthy",
 *   "data": {
 *     "status": "ok",
 *     "timestamp": "2025-01-01T00:00:00.000Z",
 *     "uptime": 3600.25,
 *     "environment": "production",
 *     "version": "1.0.0",
 *     "database": "ok"
 *   }
 * }
 *
 * Response (degraded — DB unreachable):
 * HTTP 503
 * {
 *   "success": false,
 *   "message": "Service is degraded",
 *   "data": {
 *     "status": "degraded",
 *     "timestamp": "...",
 *     "uptime": 3600.25,
 *     "environment": "production",
 *     "version": "1.0.0",
 *     "database": "unavailable"
 *   }
 * }
 *
 * This endpoint is intentionally unauthenticated — no JWT required.
 * It is excluded from the global rate limiter in app.js.
 */
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const environment = process.env.NODE_ENV || 'development';
  const version = process.env.npm_package_version || '1.0.0';

  // ─── Database connectivity check ──────────────────────────────────────────
  let dbStatus = 'ok';

  try {
    await db.query('SELECT 1');
  } catch (err) {
    dbStatus = 'unavailable';
    logger.error(`Health check: database unreachable — ${err.message}`);
  }

  const isHealthy = dbStatus === 'ok';
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    success: isHealthy,
    message: isHealthy ? 'Service is healthy' : 'Service is degraded',
    data: {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp,
      uptime: parseFloat(uptime.toFixed(2)),
      environment,
      version,
      database: dbStatus,
    },
  });
});

module.exports = router;
