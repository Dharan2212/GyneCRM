const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./test-orders.controller');
const {
  listTestOrdersQuerySchema,
  pendingUploadListQuerySchema,
  createTestOrderSchema,
  testOrderIdParamSchema,
  pendingUploadSchema,
  linkResultSchema,
  reviewInboxQuerySchema,
  reviewResultSchema,
  sendResultSchema,
} = require('./test-orders.validator');

const router = express.Router();

router.use(auth);


router.get(
  '/pending-review',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(reviewInboxQuerySchema, { source: 'query' }),
  controller.getReviewInbox,
);

router.get(
  '/review-inbox',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(reviewInboxQuerySchema, { source: 'query' }),
  controller.getReviewInbox,
);


router.get(
  '/pending-upload',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(pendingUploadListQuerySchema, { source: 'query' }),
  controller.getPendingUploadList,
);

router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(listTestOrdersQuerySchema, { source: 'query' }),
  controller.listTestOrders,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(createTestOrderSchema),
  controller.createTestOrder,
);


router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  controller.getTestOrderDetail,
);

router.patch(
  '/:id/pending-upload',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  validateRequest(pendingUploadSchema),
  controller.moveToPendingUpload,
);


router.post(
  '/:id/pending-upload',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  validateRequest(pendingUploadSchema),
  controller.moveToPendingUpload,
);

router.patch(
  '/:id/link-result',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  validateRequest(linkResultSchema),
  controller.linkResult,
);

router.patch(
  '/:id/review-result',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  validateRequest(reviewResultSchema),
  controller.reviewResult,
);

router.patch(
  '/:id/send-result',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  validateRequest(testOrderIdParamSchema, { source: 'params' }),
  validateRequest(sendResultSchema),
  controller.sendResult,
);

module.exports = router;
