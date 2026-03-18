'use strict';

/**
 * Base application error.
 *
 * All domain-specific errors extend this class.
 * isOperational = true means the error is an expected application-level
 * condition and may be safely serialised to the client via the error handler.
 * isOperational = false (InternalError) means an unexpected crash — only a
 * generic message is sent to the client; full detail goes to Sentry/logs.
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode  - Machine-readable code (sent as errors[].code)
   * @param {string|null} [field]  - Field name when error maps to a specific input field
   * @param {*}     [meta]      - Internal debug context; never exposed in production responses
   */
  constructor(message, statusCode, errorCode, field = null, meta = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.field = field;
    this.meta = meta;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request — input failed Joi schema validation.
 *
 * details is an array of { code, field, detail } objects, produced by
 * normalising the Joi error detail array in the error handler.
 *
 * Locked error code: VALIDATION_ERROR
 */
class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {Array<{ code: string, field: string|null, detail: string }>} [details]
   */
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details; // Pre-shaped for the locked error response contract
  }
}

/**
 * 401 Unauthorized — missing, invalid, or expired authentication credentials.
 *
 * Locked error codes in use:
 *   AUTHENTICATION_FAILED   — generic credential failure
 *   TOKEN_EXPIRED           — access token TTL exceeded
 *   TOKEN_INVALID           — malformed or tampered token
 *   REFRESH_TOKEN_INVALID   — refresh token absent or invalid
 */
class AuthError extends AppError {
  /**
   * @param {string} message
   * @param {string} [errorCode='AUTHENTICATION_FAILED']
   */
  constructor(message, errorCode = 'AUTHENTICATION_FAILED') {
    super(message, 401, errorCode);
  }
}

/**
 * 403 Forbidden — user is authenticated but lacks the required role.
 *
 * Locked error code: INSUFFICIENT_ROLE
 * A secondary code CROSS_TENANT_ACCESS is used when hospitalScope middleware
 * detects a tenant boundary violation.
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message='You do not have permission to perform this action']
   * @param {string} [errorCode='INSUFFICIENT_ROLE']
   */
  constructor(
    message = 'You do not have permission to perform this action',
    errorCode = 'INSUFFICIENT_ROLE',
  ) {
    super(message, 403, errorCode);
  }
}

/**
 * 404 Not Found — the requested resource does not exist or is not visible
 * to the caller given their tenant scope.
 *
 * Locked error code: RESOURCE_NOT_FOUND
 */
class NotFoundError extends AppError {
  /**
   * @param {string} resource - Human-readable resource name, e.g. 'Patient'
   */
  constructor(resource) {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * 409 Conflict — the request cannot be completed because of a state conflict
 * with an existing record (e.g. duplicate email, double-booking).
 *
 * Locked error codes in use:
 *   CONFLICT                — generic conflict
 *   DUPLICATE_RECORD        — unique constraint violation
 *   APPOINTMENT_SLOT_TAKEN  — scheduling conflict
 */
class ConflictError extends AppError {
  /**
   * @param {string} message
   * @param {string} [errorCode='CONFLICT']
   */
  constructor(message, errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

/**
 * 423 Locked — the account is temporarily locked due to repeated failed logins.
 *
 * Locked error code: ACCOUNT_LOCKED
 */
class AccountLockedError extends AppError {
  /**
   * @param {string} message
   * @param {Date|null} [lockedUntil] - Timestamp when the lockout expires
   */
  constructor(message, lockedUntil = null) {
    super(message, 423, 'ACCOUNT_LOCKED');
    this.lockedUntil = lockedUntil;
  }
}

/**
 * 422 Unprocessable Entity — the request is structurally valid but violates a
 * business rule that cannot be expressed as a schema constraint
 * (e.g. rescheduling a cancelled appointment, booking outside clinic hours).
 *
 * Locked error code: BUSINESS_RULE_VIOLATION (default)
 * Callers may pass a more specific code when it aids client-side handling.
 */
class BusinessRuleError extends AppError {
  /**
   * @param {string} message
   * @param {string} [errorCode='BUSINESS_RULE_VIOLATION']
   */
  constructor(message, errorCode = 'BUSINESS_RULE_VIOLATION') {
    super(message, 422, errorCode);
  }
}

/**
 * 500 Internal Server Error — an unexpected, non-operational error.
 *
 * This class should not be thrown directly from business logic.
 * It is used by the global error handler as the fallback for unrecognised
 * errors, after logging the full detail to Sentry.
 *
 * Locked error code: INTERNAL_SERVER_ERROR
 */
class InternalError extends AppError {
  /**
   * @param {string} [message='An unexpected error occurred. Please try again later.']
   */
  constructor(message = 'An unexpected error occurred. Please try again later.') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    this.isOperational = false;
  }
}

/**
 * createError — factory helper used throughout controllers and services.
 *
 * Signature used across the codebase:
 *   createError(statusCode, errorCode, message)
 *   createError(statusCode, errorCode, message, details)
 *
 * Returns an AppError instance with isOperational = true so the global
 * error handler serialises it cleanly to the client.
 *
 * @param {number}         statusCode  - HTTP status code
 * @param {string}         errorCode   - Machine-readable code (e.g. 'USER_NOT_FOUND')
 * @param {string}         message     - Human-readable message
 * @param {Array|string[]} [details]   - Optional details array (for validation errors)
 * @returns {AppError}
 */
const createError = (statusCode, errorCode, message, details = []) => {
  const err = new AppError(message, statusCode, errorCode);
  if (details && details.length) {
    err.details = Array.isArray(details) ? details : [details];
  }
  return err;
};

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  AccountLockedError,
  BusinessRuleError,
  InternalError,
  createError,
};
