const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./doctor.dashboard.controller');
const { doctorDashboardQuerySchema } = require('./doctor.dashboard.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/doctor',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(doctorDashboardQuerySchema, { source: 'query' }),
  controller.getDoctorDashboard,
);

module.exports = router;
