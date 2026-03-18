'use strict';

const Joi = require('joi');

/**
 * DOCTORS VALIDATOR
 */

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

/** Create a new doctor profile. Requires a pre-existing user_id. */
const createDoctorSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  primary_branch_id: Joi.string().uuid().optional().allow(null),
  specialisation: Joi.string().max(200).optional().allow('', null),
  qualification: Joi.string().max(300).optional().allow('', null),
  registration_number: Joi.string().max(100).optional().allow('', null),
  consultation_fee: Joi.number().precision(2).min(0).optional().allow(null),
  signature_url: Joi.string().max(500).optional().allow('', null),
});

/** Update an existing doctor profile. */
const updateDoctorSchema = Joi.object({
  primary_branch_id: Joi.string().uuid().optional().allow(null),
  specialisation: Joi.string().max(200).optional().allow('', null),
  qualification: Joi.string().max(300).optional().allow('', null),
  registration_number: Joi.string().max(100).optional().allow('', null),
  consultation_fee: Joi.number().precision(2).min(0).optional().allow(null),
  signature_url: Joi.string().max(500).optional().allow('', null),
  is_active: Joi.boolean().optional(),
}).min(1);

/** Query params for listing doctors. */
const listDoctorsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  branch_id: Joi.string().uuid().optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(200).optional().allow(''),
});

/**
 * Upsert schedule settings for one day.
 * Used by POST/PUT on /doctors/:id/schedule.
 */
const upsertScheduleSchema = Joi.object({
  day_of_week: Joi.string()
    .valid(...DAYS_OF_WEEK)
    .required(),
  start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'start_time must be HH:MM (24h).' }),
  end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'end_time must be HH:MM (24h).' }),
  slot_duration_minutes: Joi.number().integer().min(5).max(120).default(15),
  buffer_minutes: Joi.number().integer().min(0).max(60).default(0),
  max_patients: Joi.number().integer().min(1).optional().allow(null),
  is_active: Joi.boolean().default(true),
});

module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
  listDoctorsSchema,
  upsertScheduleSchema,
};
