'use strict';

const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST in app.js — after all routes.
 * Express identifies it as an error handler by its 4-argument signature.
 *
 * Normalises all thrown errors into the locked response envelope:
 *   Success: { success: true,  message: "...", data: { ... } }
 *   Error:   { success: false, message: "...", errors: [ ... ] }
 *
 * Error type mapping:
 *   ValidationError (Joi)       -> 422 Unprocessable Entity
 *   AppError (custom)           -> err.statusCode (explicit)
 *   JWT errors                  -> 401 (handled upstream in auth middleware)
 *   Unique constraint (pg)      -> 409 Conflict
 *   Foreign key violation (pg)  -> 422 Unprocessable Entity
 *   Not null violation (pg)     -> 422 Unprocessable Entity
 *   Generic / unknown           -> 500 Internal Server Error
 */

/**
 * PostgreSQL error code mapping.
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_MAP = {
  '23505': { status: 409, message: 'A record with this value already exists.' },
  '23503': { status: 422, message: 'Referenced record does not exist.' },
  '23502': { status: 422, message: 'A required field is missing.' },
  '23514': { status: 422, message: 'A value failed a database constraint check.' },
  '22P02': { status: 400, message: 'Invalid UUID or data type provided.' },
  '42P01': { status: 500, message: 'Internal database error. Table not found.' },
  '08006': { status: 503, message: 'Database connection failed.' },
  '08001': { status: 503, message: 'Database connection failed.' },
  '57014': { status: 503, message: 'Database query cancelled due to timeout.' },
};

/**
 * AppError
 *
 * Custom error class for intentional, operational errors.
 * Throw this inside controllers and services to produce clean HTTP errors.
 *
 * @example
 *   throw new AppError('Patient not found.', 404);
 *   throw new AppError('Appointment slot is already booked.', 409);
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * normaliseErrors(err)
 *
 * Extracts a flat errors array from Joi validation results.
 * Returns [] for non-Joi errors.
 */
const normaliseJoiErrors = (err) => {
  if (err.name === 'ValidationError' && Array.isArray(err.details)) {
    return err.details.map((d) => ({
      field: d.context?.key || d.path?.join('.') || 'unknown',
      message: d.message.replace(/['"]/g, ''),
    }));
  }
  return [];
};

/**
 * errorHandler
 *
 * Express 4-argument error-handling middleware.
 * Registered via app.use(errorHandler) after all routes.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ─── 1. Joi Validation Error ─────────────────────────────────────────────
  if (err.name === 'ValidationError' && Array.isArray(err.details)) {
    const errors = normaliseJoiErrors(err);
    logger.warn('Request validation failed', {
      path: req.path,
      method: req.method,
      errors,
    });
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the submitted data.',
      errors,
    });
  }

  // ─── 2. Operational AppError ─────────────────────────────────────────────
  if (err.isOperational && err.name === 'AppError') {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`, {
      path: req.path,
      method: req.method,
    });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // ─── 3. PostgreSQL Driver Errors ─────────────────────────────────────────
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    logger.error(`PostgreSQL error [${err.code}]: ${err.message}`, {
      path: req.path,
      method: req.method,
      detail: err.detail || null,
      constraint: err.constraint || null,
    });

    const errors = [];
    if (err.constraint) {
      errors.push({ field: err.constraint, message: mapped.message });
    }

    return res.status(mapped.status).json({
      success: false,
      message: mapped.message,
      errors,
    });
  }

  // ─── 4. CORS Error ───────────────────────────────────────────────────────
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation.',
      errors: [],
    });
  }

  // ─── 5. Payload Too Large ────────────────────────────────────────────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large. Maximum allowed size is 2MB.',
      errors: [],
    });
  }

  // ─── 6. Malformed JSON ───────────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body.',
      errors: [],
    });
  }

  // ─── 7. Unknown / Unexpected Errors ──────────────────────────────────────
  // Log full stack — never expose internals to the client
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId || null,
    hospitalId: req.hospitalId || null,
  });

  const isDev = process.env.NODE_ENV === 'development';

  return res.status(500).json({
    success: false,
    message: 'An internal server error occurred. Please try again later.',
    errors: isDev
      ? [{ field: 'internal', message: err.message, stack: err.stack }]
      : [],
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
