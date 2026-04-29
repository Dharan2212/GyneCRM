const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./reception.dashboard.controller');
const { receptionistDashboardQuerySchema } = require('./reception.dashboard.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/receptionist',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(receptionistDashboardQuerySchema, { source: 'query' }),
  controller.getReceptionDashboard,
);

module.exports = router;
