'use strict';

const logger = require('../utils/logger');

/**
 * Hospital Scope Middleware
 *
 * Enforces multi-tenant data isolation. Every authenticated request must
 * target resources belonging to the same hospitalId encoded in the JWT.
 *
 * Two enforcement strategies are provided:
 *
 * 1. enforceHospitalScope  — passive guard: injects hospitalId into
 *    req.hospitalId for use by all downstream controllers and services.
 *    This is the standard middleware applied globally to all protected routes.
 *
 * 2. validateHospitalParam — strict guard: validates that a :hospitalId
 *    route param or body field matches the token's hospitalId exactly.
 *    Used on admin-level routes that accept hospitalId explicitly.
 *
 * 3. validatePatientHospital — validates that a target patient row
 *    belongs to the requesting user's hospital before mutation.
 *    Used by patient-specific routes.
 */

/**
 * enforceHospitalScope
 *
 * Reads hospitalId from the verified JWT payload (req.user) and attaches
 * it to req.hospitalId so every downstream controller can reference it
 * without re-reading the token.
 *
 * This ensures no controller can bypass scoping by accepting a raw
 * body/query hospitalId from the client.
 */
const enforceHospitalScope = (req, res, next) => {
  if (!req.user || !req.user.hospitalId) {
    logger.warn('enforceHospitalScope: called without authenticated user on request', {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      errors: [],
    });
  }

  // Attach scoped identifiers for downstream use
  req.hospitalId = req.user.hospitalId;
  req.branchId = req.user.branchId || null;
  req.userId = req.user.userId;
  req.userRole = req.user.role;

  return next();
};

/**
 * validateHospitalParam
 *
 * Strict check used on routes where :hospitalId appears in the URL.
 * Verifies the route param matches the JWT's hospitalId.
 *
 * Example route: GET /api/v1/hospitals/:hospitalId/settings
 */
const validateHospitalParam = (req, res, next) => {
  const paramHospitalId = req.params.hospitalId;

  if (!paramHospitalId) {
    return res.status(400).json({
      success: false,
      message: 'hospitalId parameter is required.',
      errors: [],
    });
  }

  if (paramHospitalId !== req.hospitalId) {
    logger.warn('Hospital scope violation attempt', {
      userId: req.userId,
      tokenHospitalId: req.hospitalId,
      paramHospitalId,
      path: req.path,
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      message: 'Access denied. Hospital scope violation.',
      errors: [],
    });
  }

  return next();
};

/**
 * validateBodyHospitalId
 *
 * When a request body contains hospitalId, this middleware ensures it
 * matches the token's hospitalId. Prevents clients from injecting a
 * different hospital's ID into write operations.
 *
 * Silently corrects the body hospitalId to the token value to prevent
 * confusion if the frontend accidentally sends a stale value.
 *
 * NOTE: The overwrite is intentional — the server's token value is
 * always authoritative. Downstream services must read req.hospitalId,
 * not req.body.hospitalId.
 */
const validateBodyHospitalId = (req, res, next) => {
  if (req.body && req.body.hospitalId) {
    if (req.body.hospitalId !== req.hospitalId) {
      logger.warn('Body hospitalId mismatch — overwriting with token value', {
        userId: req.userId,
        tokenHospitalId: req.hospitalId,
        bodyHospitalId: req.body.hospitalId,
        path: req.path,
      });
    }
    // Authoritative override — always use JWT value
    req.body.hospitalId = req.hospitalId;
  }
  return next();
};

module.exports = {
  enforceHospitalScope,
  validateHospitalParam,
  validateBodyHospitalId,
};
