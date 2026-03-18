'use strict';

/**
 * Role-Based Access Control Middleware
 *
 * Roles (locked from architecture):
 *   admin        - Full system access
 *   doctor       - Clinical data + own appointments
 *   receptionist - Patient reg, appointments, billing, documents
 *   staff        - Document upload, limited patient read
 *
 * Usage:
 *   router.get('/patients', authenticate, requireRole('admin', 'receptionist'), controller)
 *   router.delete('/users/:id', authenticate, requireRole('admin'), controller)
 */

/**
 * requireRole(...allowedRoles)
 * Returns middleware that permits the request only if req.user.role
 * is one of the provided allowedRoles. authenticate must run first.
 *
 * @param {...string} allowedRoles - One or more role strings
 * @returns {Function} Express middleware
 */
const requireRole = (...allowedRoles) => {
  // Validate at registration time (fail-fast during startup)
  if (allowedRoles.length === 0) {
    throw new Error('requireRole() called with no roles — at least one role required');
  }

  const validRoles = new Set(['admin', 'doctor', 'receptionist', 'staff']);
  for (const r of allowedRoles) {
    if (!validRoles.has(r)) {
      throw new Error(`requireRole() received unknown role: "${r}"`);
    }
  }

  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    // authenticate middleware must have run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errors: [],
      });
    }

    const { role } = req.user;

    if (!allowed.has(role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${[...allowed].join(', ')}. Your role: ${role}.`,
        errors: [],
      });
    }

    return next();
  };
};

/**
 * requireAnyRole
 * Alias for requireRole — improves readability at route definition.
 *
 * Usage: requireAnyRole('admin', 'doctor')
 */
const requireAnyRole = requireRole;

/**
 * requireAdmin
 * Convenience shorthand for requireRole('admin').
 */
const requireAdmin = requireRole('admin');

/**
 * requireDoctor
 * Convenience shorthand for requireRole('doctor').
 */
const requireDoctor = requireRole('doctor');

/**
 * requireReceptionist
 * Convenience shorthand for requireRole('receptionist').
 */
const requireReceptionist = requireRole('receptionist');

/**
 * roleCheck — compatibility shim for Phase 5 route modules.
 *
 * Phase 5 routes call roleCheck(['doctor', 'admin']) (array argument).
 * This shim spreads the array into requireRole(...allowedRoles).
 *
 * @param {string[]} rolesArray
 * @returns {Function} Express middleware
 */
const roleCheck = (rolesArray) => requireRole(...rolesArray);

module.exports = {
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireDoctor,
  requireReceptionist,
  roleCheck,
};
