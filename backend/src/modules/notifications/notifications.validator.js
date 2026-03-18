'use strict';

const Joi = require('joi');

/**
 * Notifications Module — Joi Validators
 *
 * Covers:
 *   GET  /api/v1/notifications          — listNotificationsSchema
 *   GET  /api/v1/notifications/:id      — (UUID param, no body schema needed)
 *   POST /api/v1/notifications/:id/retry — retryNotificationSchema (no body — id only)
 *
 * notification_status_enum (Phase 2 locked): pending | sent | failed | suppressed
 */

const NOTIFICATION_STATUS_VALUES = ['pending', 'sent', 'failed', 'suppressed'];

const VALID_EVENT_TYPES = [
  'APPOINTMENT_CREATED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_REMINDER_24H',
  'APPOINTMENT_REMINDER_2H',
  'APPOINTMENT_MISSED',
  'APPOINTMENT_CHECKED_IN',
  'DOCTOR_UNAVAILABILITY_APPLIED',
  'CONSULTATION_COMPLETED',
  'PRESCRIPTION_ISSUED',
  'TEST_ORDER_CREATED',
  'TEST_OVERDUE',
  'FOLLOWUP_DUE',
  'PREGNANCY_MILESTONE_REACHED',
  'PREGNANCY_WEEKLY_TIPS',
  'PREGNANCY_HIGH_RISK_FLAGGED',
  'DELIVERY_RECORDED',
  'POSTPARTUM_FOLLOWUP_DUE',
  'WAITLIST_SLOT_AVAILABLE',
  'FEEDBACK_REQUESTED',
];

/**
 * GET /api/v1/notifications
 * Query parameters for paginated notification list.
 * Admin: can filter by all fields.
 * Doctor: filtered to own hospital (enforced in service layer).
 */
const listNotificationsSchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(20),
  sort_by:    Joi.string().valid('created_at', 'event_type', 'status').default('created_at'),
  sort_dir:   Joi.string().valid('asc', 'desc').default('desc'),

  // Filters
  status:     Joi.string().valid(...NOTIFICATION_STATUS_VALUES),
  event_type: Joi.string().valid(...VALID_EVENT_TYPES),
  patient_id: Joi.string().uuid(),
  entity_type: Joi.string().max(100),
  date_from:  Joi.date().iso(),
  date_to:    Joi.date().iso().when('date_from', {
    is:   Joi.exist(),
    then: Joi.date().min(Joi.ref('date_from')),
  }),
});

/**
 * UUID path param — used for GET /:id and POST /:id/retry.
 * Validated inline in controller via this schema.
 */
const notificationIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

module.exports = {
  listNotificationsSchema,
  notificationIdParamSchema,
  NOTIFICATION_STATUS_VALUES,
};
