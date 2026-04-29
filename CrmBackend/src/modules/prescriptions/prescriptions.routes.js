const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./prescriptions.controller');
const {
  createPrescriptionSchema,
  prescriptionDetailSchema,
  issuePrescriptionSchema,
  voidPrescriptionSchema,
  prescriptionPdfSchema,
  sendPrescriptionSchema,
} = require('./prescriptions.validator');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(createPrescriptionSchema),
  controller.createPrescription,
);

router.get(
  '/:id/pdf',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionPdfSchema, { source: 'params' }),
  controller.getPrescriptionPdf,
);

router.patch(
  '/:id/issue',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  validateRequest(issuePrescriptionSchema),
  controller.issuePrescription,
);


router.post(
  '/:id/issue',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  validateRequest(issuePrescriptionSchema),
  controller.issuePrescription,
);

router.patch(
  '/:id/void',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  validateRequest(voidPrescriptionSchema),
  controller.voidPrescription,
);

router.patch(
  '/:id/send',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  validateRequest(sendPrescriptionSchema),
  controller.sendPrescription,
);


router.post(
  '/:id/send',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  validateRequest(sendPrescriptionSchema),
  controller.sendPrescription,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(prescriptionDetailSchema, { source: 'params' }),
  controller.getPrescriptionDetail,
);

module.exports = router;
