'use strict';

const express = require('express');
const router  = express.Router();

const controller = require('./appointments.controller');
const { authenticate }         = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck }            = require('../../middleware/role-check.middleware');

/**
 * APPOINTMENTS ROUTES
 * Mounted at /api/v1/appointments
 *
 * Middleware chain: authenticate → enforceHospitalScope → roleCheck → controller
 *
 * Automation events fired (Phase 6 Batch 2):
 *   POST /             → APPOINTMENT_CREATED   (on successful booking)
 *   PATCH /:id/status  → APPOINTMENT_CANCELLED (when newStatus = cancelled)
 *                      → APPOINTMENT_CHECKED_IN (when newStatus = checked_in via status patch)
 *   POST /:id/check-in → APPOINTMENT_CHECKED_IN (dedicated check-in endpoint)
 *   PATCH /:id/reschedule → APPOINTMENT_CREATED (for the newly created slot)
 */

// ── GET /api/v1/appointments ──────────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'doctor', 'receptionist']),
  controller.listAppointments,
);

// ── POST /api/v1/appointments ─────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'receptionist']),
  controller.createAppointment,
);

// ── GET /api/v1/appointments/:id ──────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'doctor', 'receptionist']),
  controller.getAppointmentById,
);

// ── PATCH /api/v1/appointments/:id/status ────────────────────────────────────
router.patch(
  '/:id/status',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'doctor', 'receptionist']),
  controller.updateAppointmentStatus,
);

// ── POST /api/v1/appointments/:id/check-in ───────────────────────────────────
// Dedicated endpoint: transitions to checked_in, generates queue token,
// fires APPOINTMENT_CHECKED_IN to N8N.
router.post(
  '/:id/check-in',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'receptionist']),
  controller.checkInAppointment,
);

// ── PATCH /api/v1/appointments/:id/reschedule ─────────────────────────────────
router.patch(
  '/:id/reschedule',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin', 'receptionist']),
  controller.rescheduleAppointment,
);

// ── DELETE /api/v1/appointments/:id ──────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  enforceHospitalScope,
  roleCheck(['admin']),
  controller.deleteAppointment,
);

module.exports = router;
