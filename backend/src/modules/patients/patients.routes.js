'use strict';

const express = require('express');
const router = express.Router();

const controller = require('./patients.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { globalRateLimiter } = require('../../middleware/rate-limiter.middleware');

router.use(authenticate);
router.use(enforceHospitalScope);
router.use(globalRateLimiter);

router.get(
  '/',
  roleCheck(['admin', 'doctor', 'receptionist', 'staff']),
  controller.listPatients
);

router.post(
  '/',
  roleCheck(['admin', 'receptionist']),
  controller.createPatient
);

router.get(
  '/:id',
  roleCheck(['admin', 'doctor', 'receptionist', 'staff']),
  controller.getPatientById
);

router.put(
  '/:id',
  roleCheck(['admin', 'receptionist']),
  controller.updatePatient
);

router.delete(
  '/:id',
  roleCheck(['admin']),
  controller.deletePatient
);

module.exports = router;