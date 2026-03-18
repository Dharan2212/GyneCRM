'use strict';

/**
 * Notifications Routes — /api/v1/notifications
 *
 * RBAC:
 *   GET  /                   admin, doctor — list all notifications (paginated + filtered)
 *   GET  /failed             admin         — list failed notifications for retry dashboard
 *   GET  /automation-status  admin         — automation readiness report (Phase 6 Batch 6)
 *   GET  /:id                admin, doctor — get single notification
 *   POST /:id/retry          admin         — retry a failed notification
 *
 * Auth:  JWT required (authenticate middleware)
 * Scope: hospital_id enforced via enforceHospitalScope middleware
 *
 * ROUTE ORDERING — all static paths MUST be registered BEFORE /:id:
 *   /failed             static — registered before /:id
 *   /automation-status  static — registered before /:id
 * Without this order Express would treat 'failed' and 'automation-status' as :id params.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('./notifications.controller');
const { authenticate }         = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck }            = require('../../middleware/role-check.middleware');

// ── GET /api/v1/notifications ─────────────────────────────────────────────────
// Paginated list with filters. Admin sees all; doctors see hospital-scoped only.
router.get(
  '/',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'doctor']),
  controller.listNotifications,
);

// ── GET /api/v1/notifications/failed ─────────────────────────────────────────
// MUST be before /:id — static path takes priority over param route.
// Admin-only: returns 50 most recent failed notifications for retry dashboard.
router.get(
  '/failed',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin']),
  controller.listFailedNotifications,
);

// ── GET /api/v1/notifications/automation-status ───────────────────────────────
// MUST be before /:id — static path takes priority over param route.
// Admin-only: returns automation layer readiness report.
// Checks: N8N credentials, template coverage, recent 24h stats.
// Non-destructive — never sends real messages or modifies data.
router.get(
  '/automation-status',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin']),
  controller.getAutomationStatus,
);

// ── GET /api/v1/notifications/:id ─────────────────────────────────────────────
// Registered AFTER all static routes to prevent them being caught as :id.
router.get(
  '/:id',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'doctor']),
  controller.getNotification,
);

// ── POST /api/v1/notifications/:id/retry ──────────────────────────────────────
// Admin-only retry. Re-dispatches a failed notification to N8N.
router.post(
  '/:id/retry',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin']),
  controller.retryNotification,
);

module.exports = router;
