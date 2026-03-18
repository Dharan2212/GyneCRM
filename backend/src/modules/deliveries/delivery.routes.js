'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./delivery.controller');
const { authenticate }         = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck }            = require('../../middleware/role-check.middleware');

/**
 * Delivery Routes — mounted at /api/v1/deliveries in routes/index.js
 * All paths here are RELATIVE (no /deliveries prefix).
 * Middleware chain: authenticate → enforceHospitalScope → roleCheck
 */

// POST   /api/v1/deliveries
router.post(
  '/',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']),
  controller.createDelivery
);

// GET    /api/v1/deliveries/:id
router.get(
  '/:id',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']),
  controller.getDelivery
);

// PUT    /api/v1/deliveries/:id
router.put(
  '/:id',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']),
  controller.updateDelivery
);

// GET    /api/v1/deliveries/patient/:patientId
// Static 'patient' segment MUST be before /:id to avoid collision
router.get(
  '/patient/:patientId',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']),
  controller.listPatientDeliveries
);

// GET    /api/v1/deliveries/postpartum/:patientId
router.get(
  '/postpartum/:patientId',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']),
  controller.listPatientPostpartumFollowups
);

// PUT    /api/v1/deliveries/postpartum-followups/:id
router.put(
  '/postpartum-followups/:id',
  authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']),
  controller.updatePostpartumFollowup
);

module.exports = router;
