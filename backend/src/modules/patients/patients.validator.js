'use strict';

const Joi = require('joi');

/**
 * PATIENTS VALIDATOR
 * All schemas align to the patients table defined in Phase 2
 * (Migration 013). Field constraints match column definitions exactly.
 */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const phonePattern = /^\+?[0-9]{7,20}$/;

/** Register a new patient. */
const createPatientSchema = Joi.object({
  full_name: Joi.string().max(200).required(),
  phone: Joi.string().pattern(phonePattern).required().messages({
    'string.pattern.base': 'phone must be a valid phone number (7–20 digits, optional + prefix).',
  }),
  date_of_birth: Joi.date().iso().max('now').optional().allow(null),
  blood_group: Joi.string()
    .valid(...BLOOD_GROUPS)
    .optional()
    .allow('', null),
  address: Joi.string().max(1000).optional().allow('', null),
  emergency_contact_name: Joi.string().max(200).optional().allow('', null),
  emergency_contact_phone: Joi.string().pattern(phonePattern).optional().allow('', null),
  family_whatsapp: Joi.string().pattern(phonePattern).optional().allow('', null),
});

/** Update an existing patient record. */
const updatePatientSchema = Joi.object({
  full_name: Joi.string().max(200).optional(),
  phone: Joi.string().pattern(phonePattern).optional(),
  date_of_birth: Joi.date().iso().max('now').optional().allow(null),
  blood_group: Joi.string()
    .valid(...BLOOD_GROUPS)
    .optional()
    .allow('', null),
  address: Joi.string().max(1000).optional().allow('', null),
  emergency_contact_name: Joi.string().max(200).optional().allow('', null),
  emergency_contact_phone: Joi.string().pattern(phonePattern).optional().allow('', null),
  family_whatsapp: Joi.string().pattern(phonePattern).optional().allow('', null),
  is_active: Joi.boolean().optional(),
}).min(1);

/** Query params for listing / searching patients. */
const listPatientsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  phone: Joi.string().pattern(phonePattern).optional(),
  search: Joi.string().max(200).optional().allow(''),
  is_active: Joi.boolean().optional(),
  blood_group: Joi.string()
    .valid(...BLOOD_GROUPS)
    .optional(),
});

/** Soft-delete payload — reason is required per architecture rules. */
const deletePatientSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required().messages({
    'string.min': 'A deletion reason of at least 5 characters is required.',
  }),
});

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  listPatientsSchema,
  deletePatientSchema,
};
