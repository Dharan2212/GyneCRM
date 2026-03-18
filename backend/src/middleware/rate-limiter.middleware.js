'use strict';

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate Limiter Middleware
 *
 * Architecture-locked limits:
 *   Global  : 100 requests per 15 minutes per IP
 *   Auth    : 5 requests per 15 minutes per IP (login endpoint only)
 *
 * All limiters use the locked response envelope:
 *   { success: false, message: "...", errors: [] }
 */

/**
 * Helper: build a standardised rate-limit exceeded handler.
 */
const buildHandler = (message) => (req, res) => {
  logger.warn(`Rate limit exceeded`, {
    ip: req.ip,
    path: req.path,
    method: req.method,
    message,
  });

  res.status(429).json({
    success: false,
    message,
    errors: [],
  });
};

/**
 * globalRateLimiter
 *
 * Applied to ALL routes in app.js.
 * Limit: 100 requests per 15-minute window per IP.
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,     // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: buildHandler(
    'Too many requests. Please wait before making another request.'
  ),
  skip: (req) => {
    // Health check endpoint is never rate-limited
    return req.path === '/health' || req.path === '/api/v1/health';
  },
});

/**
 * authRateLimiter
 *
 * Applied only to POST /api/v1/auth/login.
 * Limit: 5 requests per 15-minute window per IP.
 * Prevents brute-force credential attacks.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: buildHandler(
    'Too many login attempts. Please wait 15 minutes before trying again.'
  ),
});

/**
 * passwordResetRateLimiter
 *
 * Applied to POST /api/v1/auth/forgot-password and POST /api/v1/auth/reset-password.
 * Limit: 3 requests per 15-minute window per IP.
 */
const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: buildHandler(
    'Too many password reset requests. Please wait 15 minutes.'
  ),
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
};
