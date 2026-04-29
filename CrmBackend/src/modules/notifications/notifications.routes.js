const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./notifications.controller');
const {
  createNotificationSchema,
  listNotificationsSchema,
  notificationDetailParamSchema,
  cancelNotificationSchema,
} = require('./notifications.validator');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(createNotificationSchema),
  controller.createNotification,
);

router.get(
  '/',
  requireRole(ROLES.ADMIN),
  validateRequest(listNotificationsSchema, { source: 'query' }),
  controller.listNotifications,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN),
  validateRequest(notificationDetailParamSchema, { source: 'params' }),
  controller.getNotificationDetail,
);

router.patch(
  '/:id/cancel',
  requireRole(ROLES.ADMIN),
  validateRequest(notificationDetailParamSchema, { source: 'params' }),
  validateRequest(cancelNotificationSchema),
  controller.cancelNotification,
);

module.exports = router;
