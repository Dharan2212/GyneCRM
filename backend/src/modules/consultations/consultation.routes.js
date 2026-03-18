'use strict';

const express = require('express');
const router = express.Router();
const consultationController = require('./consultation.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

// All consultation routes: JWT → hospital scope → RBAC → controller
// Receptionist does NOT have write access to consultations.

router.post(
  '/',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.createConsultation
);

router.get(
  '/:id',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.getConsultation
);

router.put(
  '/:id',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.updateConsultation
);

router.post(
  '/:id/finalize',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.finalizeConsultation
);

router.post(
  '/:id/override',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.overrideConsultation
);

router.get(
  '/:id/pdf',
  authenticate,
  enforceHospitalScope,
  roleCheck(['doctor', 'admin']),
  consultationController.getConsultationPdf
);

module.exports = router;
