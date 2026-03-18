'use strict';

const Joi = require('joi');

/**
 * APPOINTMENTS VALIDATOR
 * Schemas align to the appointments table (Migration 017).
 * Status lifecycle and visit_type ENUMs match the Phase 2 ENUM registry.
 */

/**
 * 14-value appointment status lifecycle (Phase 2 ENUM registry).
 * Only a subset are externally settable via the status PATCH —
 * the full list is kept here for transition enforcement in the service layer.
 */
const APPOINTMENT_STATUSES = [
  'draft',
  'scheduled',
  'confirmed',
  'arrived',
  'checked_in',
  'waiting',
  'with_doctor',
  'in_consultation',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show',
  'emergency',
  'blocked',
  'doctor_unavailable',
  'pending_confirmation',
  'walk_in',
  'called',
  'paused',
];

/**
 * Statuses that callers are allowed to set via PATCH /:id/status.
 * Lifecycle transitions like 'rescheduled' and 'completed' are managed
 * by dedicated endpoints (reschedule, consultation finalise).
 * 'checked_in' is allowed here for flexibility but the dedicated
 * POST /:id/check-in endpoint is preferred (generates queue token).
 */
const PATCHABLE_STATUSES = [
  'confirmed',
  'arrived',
  'checked_in',
  'waiting',
  'with_doctor',
  'in_consultation',
  'completed',
  'cancelled',
  'no_show',
  'called',
  'paused',
  'pending_confirmation',
];

const VISIT_TYPES = ['new', 'follow_up', 'antenatal', 'postnatal', 'emergency'];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Book a new appointment. */
const createAppointmentSchema = Joi.object({
  patient_id:          Joi.string().uuid().required(),
  doctor_id:           Joi.string().uuid().required(),
  branch_id:           Joi.string().uuid().required(),
  appointment_date:    Joi.date().iso().min('now').required().messages({
    'date.min': 'Appointment date cannot be in the past.',
  }),
  appointment_time:    Joi.string()
    .pattern(TIME_PATTERN)
    .required()
    .messages({ 'string.pattern.base': 'appointment_time must be HH:MM (24h).' }),
  visit_type:          Joi.string().valid(...VISIT_TYPES).required(),
  appointment_type_id: Joi.string().uuid().optional().allow(null),
  notes:               Joi.string().max(1000).optional().allow('', null),
  is_emergency:        Joi.boolean().default(false),
});

/** Query params for listing appointments. */
const listAppointmentsSchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(20),
  doctor_id:  Joi.string().uuid().optional(),
  patient_id: Joi.string().uuid().optional(),
  branch_id:  Joi.string().uuid().optional(),
  status:     Joi.string().valid(...APPOINTMENT_STATUSES).optional(),
  date_from:  Joi.date().iso().optional(),
  date_to:    Joi.date().iso().optional(),
  visit_type: Joi.string().valid(...VISIT_TYPES).optional(),
});

/** PATCH /:id/status — advance or update status. */
const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...PATCHABLE_STATUSES).required(),
  cancellation_reason: Joi.when('status', {
    is:        'cancelled',
    then:      Joi.string().min(5).max(500).required().messages({
      'string.min': 'A cancellation reason of at least 5 characters is required.',
    }),
    otherwise: Joi.optional().allow('', null),
  }),
});

/** POST /:id/check-in — dedicated check-in. No body required. */
const checkInSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow('', null),
});

/** PATCH /:id/reschedule — creates a replacement appointment linked to original. */
const rescheduleSchema = Joi.object({
  appointment_date: Joi.date().iso().min('now').required().messages({
    'date.min': 'Rescheduled date cannot be in the past.',
  }),
  appointment_time: Joi.string()
    .pattern(TIME_PATTERN)
    .required()
    .messages({ 'string.pattern.base': 'appointment_time must be HH:MM (24h).' }),
  reason:    Joi.string().max(500).optional().allow('', null),
  branch_id: Joi.string().uuid().optional(),
  doctor_id: Joi.string().uuid().optional(),
});

module.exports = {
  createAppointmentSchema,
  listAppointmentsSchema,
  updateStatusSchema,
  checkInSchema,
  rescheduleSchema,
  APPOINTMENT_STATUSES,
  PATCHABLE_STATUSES,
};
