const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./consultations.controller');
const {
  createConsultationSchema,
  consultationDetailSchema,
  updateConsultationSchema,
  updateConsultationStatusSchema,
  finaliseConsultationSchema,
  consultationWorkspaceSchema,
  followUpListQuerySchema,
  consultationFollowUpSchema,
  followUpStatusParamsSchema,
  followUpStatusUpdateSchema,
} = require('./consultations.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/follow-ups',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(followUpListQuerySchema, { source: 'query' }),
  controller.listFollowUps,
);

router.patch(
  '/follow-ups/:id/status',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(followUpStatusParamsSchema, { source: 'params' }),
  validateRequest(followUpStatusUpdateSchema),
  controller.updateFollowUpStatus,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(createConsultationSchema),
  controller.createConsultation,
);

router.get(
  '/:id/follow-up',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationFollowUpSchema, { source: 'params' }),
  controller.getConsultationFollowUp,
);

router.get(
  '/:id/workspace',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationWorkspaceSchema, { source: 'params' }),
  controller.getConsultationWorkspace,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationDetailSchema, { source: 'params' }),
  controller.getConsultationDetail,
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationDetailSchema, { source: 'params' }),
  validateRequest(updateConsultationSchema),
  controller.updateConsultation,
);

router.patch(
  '/:id/status',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationDetailSchema, { source: 'params' }),
  validateRequest(updateConsultationStatusSchema),
  controller.updateConsultationStatus,
);

router.patch(
  '/:id/finalise',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(consultationDetailSchema, { source: 'params' }),
  validateRequest(finaliseConsultationSchema),
  controller.finaliseConsultation,
);

module.exports = router;
