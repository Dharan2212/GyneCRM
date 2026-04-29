const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./patients.controller');
const {
  listPatientsSchema,
  registerPatientSchema,
  patientDetailSchema,
  updatePatientSchema,
  updatePatientCategorySchema,
  categoryCountQuerySchema,
} = require('./patients.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/category-counts',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(categoryCountQuerySchema, { source: 'query' }),
  controller.getPatientCategoryCounts,
);

router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(listPatientsSchema, { source: 'query' }),
  controller.listPatients,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(registerPatientSchema),
  controller.registerPatient,
);


router.get(
  '/:id/hub',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(patientDetailSchema, { source: 'params' }),
  controller.getPatientHub,
);

router.get(
  '/:id/category-history',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(patientDetailSchema, { source: 'params' }),
  controller.getPatientCategoryHistory,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(patientDetailSchema, { source: 'params' }),
  controller.getPatientDetail,
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(patientDetailSchema, { source: 'params' }),
  validateRequest(updatePatientSchema),
  controller.updatePatient,
);

router.patch(
  '/:id/category',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(patientDetailSchema, { source: 'params' }),
  validateRequest(updatePatientCategorySchema),
  controller.updatePatientCategory,
);

module.exports = router;
