'use strict';

const express = require('express');
const router = express.Router();

const controller = require('./hospital.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role-check.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { globalRateLimiter } = require('../../middleware/rate-limiter.middleware');

/**
 * HOSPITAL ROUTES
 * All routes: Admin only, hospital-scoped.
 * Mounted at /api/v1/hospital
 */

router.use(authenticate);
router.use(enforceHospitalScope);
router.use(requireRole('admin'));
router.use(globalRateLimiter);

// GET /api/v1/hospital
router.get('/', controller.getHospital);

// GET /api/v1/hospital/settings
router.get('/settings', controller.getSettings);

// PUT /api/v1/hospital/settings
router.put('/settings', controller.updateSettings);

module.exports = router;