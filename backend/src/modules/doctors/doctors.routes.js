'use strict';

const express = require('express');
const router = express.Router();

const controller = require('./doctors.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { globalRateLimiter } = require('../../middleware/rate-limiter.middleware');

router.use(authenticate);
router.use(enforceHospitalScope);
router.use(globalRateLimiter);

router.get(
  '/',
  roleCheck(['admin', 'doctor', 'receptionist']),
  controller.listDoctors
);

router.post(
  '/',
  roleCheck(['admin']),
  controller.createDoctor
);

router.get(
  '/:id',
  roleCheck(['admin', 'doctor', 'receptionist']),
  controller.getDoctorById
);

router.put(
  '/:id',
  roleCheck(['admin']),
  controller.updateDoctor
);

module.exports = router;