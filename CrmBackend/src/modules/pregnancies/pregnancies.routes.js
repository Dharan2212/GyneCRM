const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./pregnancies.controller');
const {
  createPregnancySchema,
  pregnancyDetailSchema,
  updatePregnancySchema,
  highRiskUpdateSchema,
  milestoneUpdateSchema,
  milestoneStatusParamsSchema,
  milestoneStatusUpdateSchema,
} = require('./pregnancies.validator');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(createPregnancySchema),
  controller.createPregnancy,
);

router.patch(
  '/:id/high-risk',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(pregnancyDetailSchema, { source: 'params' }),
  validateRequest(highRiskUpdateSchema),
  controller.updatePregnancyHighRisk,
);


router.get(
  '/:id/milestones',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(pregnancyDetailSchema, { source: 'params' }),
  controller.getPregnancyMilestones,
);

router.patch(
  '/:id/milestones',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(pregnancyDetailSchema, { source: 'params' }),
  validateRequest(milestoneUpdateSchema),
  controller.updatePregnancyMilestones,
);

router.patch(
  '/:id/milestones/:milestoneCode/status',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(milestoneStatusParamsSchema, { source: 'params' }),
  validateRequest(milestoneStatusUpdateSchema),
  controller.updatePregnancyMilestoneStatus,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(pregnancyDetailSchema, { source: 'params' }),
  controller.getPregnancyDetail,
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(pregnancyDetailSchema, { source: 'params' }),
  validateRequest(updatePregnancySchema),
  controller.updatePregnancy,
);

module.exports = router;
