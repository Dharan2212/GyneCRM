const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./documents.controller');
const { uploadUrlSchema, createDocumentSchema, documentDetailSchema, reviewInboxQuerySchema, reviewDocumentSchema, flagDocumentSchema } = require('./documents.validator');

const router = express.Router();

router.use(auth);


router.get(
  '/review-inbox',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(reviewInboxQuerySchema, { source: 'query' }),
  controller.getReviewInbox,
);

router.post(
  '/:id/review',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(documentDetailSchema, { source: 'params' }),
  validateRequest(reviewDocumentSchema),
  controller.reviewDocument,
);

router.post(
  '/:id/flag',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(documentDetailSchema, { source: 'params' }),
  validateRequest(flagDocumentSchema),
  controller.flagDocument,
);

router.post(
  '/upload-url',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(uploadUrlSchema),
  controller.getUploadUrlFoundation,
);


router.get(
  '/:id/url',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(documentDetailSchema, { source: 'params' }),
  controller.getDocumentUrl,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(createDocumentSchema),
  controller.createDocument,
);

module.exports = router;
