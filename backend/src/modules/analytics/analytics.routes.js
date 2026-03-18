'use strict';

/**
 * Analytics Routes — Phase 5 Batch 7
 *
 * All routes:
 *   → authenticate        (validates JWT, attaches req.user)
 *   → enforceHospitalScope (injects req.hospitalId)
 *   → roleCheck(['admin']) (admin only)
 *   → validator           (query/param validation via Joi)
 *   → controller          (thin handler)
 */

const express = require('express');
const router  = express.Router();

const controller = require('./analytics.controller');
const { authenticate }         = require('../../middleware/auth.middleware');
const { roleCheck }            = require('../../middleware/role-check.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');

const {
  validateOverview,
  validateRevenue,
  validateAppointments,
  validateDoctorWorkload,
  validatePatientRetention,
  validateHighRisk,
  validateTestCompletion,
  validateDayClose,
  validateDeliveries,
  validateBranchParams,
} = require('../../validators/analytics.validator');

// ─── Apply auth + scope + RBAC to all analytics routes ────────────────────────
router.use(authenticate);
router.use(enforceHospitalScope);
router.use(roleCheck(['admin']));

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/v1/analytics/overview
router.get('/overview',          validateOverview,         controller.getOverview);

// GET /api/v1/analytics/revenue
router.get('/revenue',           validateRevenue,          controller.getRevenue);

// GET /api/v1/analytics/appointments
router.get('/appointments',      validateAppointments,     controller.getAppointments);

// GET /api/v1/analytics/doctor-workload
router.get('/doctor-workload',   validateDoctorWorkload,   controller.getDoctorWorkload);

// GET /api/v1/analytics/patient-retention
router.get('/patient-retention', validatePatientRetention, controller.getPatientRetention);

// GET /api/v1/analytics/high-risk
router.get('/high-risk',         validateHighRisk,         controller.getHighRisk);

// GET /api/v1/analytics/test-completion
router.get('/test-completion',   validateTestCompletion,   controller.getTestCompletion);

// GET /api/v1/analytics/day-close
router.get('/day-close',         validateDayClose,         controller.getDayClose);

// GET /api/v1/analytics/deliveries
router.get('/deliveries',        validateDeliveries,       controller.getDeliveries);

// GET /api/v1/analytics/branch/:branchId
router.get('/branch/:branchId',  validateBranchParams,     controller.getBranchAnalytics);

module.exports = router;
