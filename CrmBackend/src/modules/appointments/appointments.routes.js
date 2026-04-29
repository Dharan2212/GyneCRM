const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./appointments.controller');
const {
  listAppointmentsSchema,
  createAppointmentSchema,
  appointmentDetailSchema,
  updateAppointmentStatusSchema,
  checkInAppointmentSchema,
  rescheduleAppointmentSchema,
  listWaitlistSchema,
  createWaitlistSchema,
  waitlistDetailSchema,
  updateWaitlistStatusSchema,
} = require('./appointments.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/waitlist',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(listWaitlistSchema, { source: 'query' }),
  controller.listWaitlist,
);

router.post(
  '/waitlist',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(createWaitlistSchema),
  controller.createWaitlist,
);

router.patch(
  '/waitlist/:id/status',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(waitlistDetailSchema, { source: 'params' }),
  validateRequest(updateWaitlistStatusSchema),
  controller.updateWaitlistStatus,
);

router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validateRequest(listAppointmentsSchema, { source: 'query' }),
  controller.listAppointments,
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(createAppointmentSchema),
  controller.createAppointment,
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validateRequest(appointmentDetailSchema, { source: 'params' }),
  controller.getAppointmentDetail,
);

router.patch(
  '/:id/status',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(appointmentDetailSchema, { source: 'params' }),
  validateRequest(updateAppointmentStatusSchema),
  controller.updateAppointmentStatus,
);

router.patch(
  '/:id/check-in',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(appointmentDetailSchema, { source: 'params' }),
  validateRequest(checkInAppointmentSchema),
  controller.checkInAppointment,
);


router.post(
  '/:id/check-in',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(appointmentDetailSchema, { source: 'params' }),
  validateRequest(checkInAppointmentSchema),
  controller.checkInAppointment,
);

router.patch(
  '/:id/reschedule',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(appointmentDetailSchema, { source: 'params' }),
  validateRequest(rescheduleAppointmentSchema),
  controller.rescheduleAppointment,
);

module.exports = router;
