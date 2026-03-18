'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB migrations ────────────────────────────────────

/**
 * Pregnancy status ENUM from migration 016.
 * active → the pregnancy is ongoing.
 * delivered → closure via normal/CS delivery (links to deliveries table in Batch 8).
 * miscarriage → closure due to pregnancy loss.
 * terminated → closure due to voluntary/medical termination.
 */
const PREGNANCY_STATUS = {
  ACTIVE: 'active',
  DELIVERED: 'delivered',
  MISCARRIAGE: 'miscarriage',
  TERMINATED: 'terminated',
};

/**
 * Allowed closure status values.
 * 'delivered' is intentionally allowed here — Batch 8 (delivery module) will
 * also close pregnancy via its own delivery record creation flow.
 * Direct closure via this endpoint covers miscarriage and terminated paths.
 */
const CLOSE_STATUS_VALUES = [
  PREGNANCY_STATUS.DELIVERED,
  PREGNANCY_STATUS.MISCARRIAGE,
  PREGNANCY_STATUS.TERMINATED,
];

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/pregnancies
 */
const createPregnancySchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  doctor_id: Joi.string().uuid().required(),
  lmp: Joi.date()
    .iso()
    .max('now') // LMP cannot be in the future
    .required()
    .messages({
      'date.max': 'LMP date cannot be in the future.',
    }),
  gravida: Joi.number().integer().min(1).max(30).required(),
  para: Joi.number()
    .integer()
    .min(0)
    .max(29)
    .required()
    .custom((value, helpers) => {
      const gravida = helpers.state.ancestors[0]?.gravida;
      // para must be less than gravida (current pregnancy counts toward gravida)
      if (gravida !== undefined && value >= gravida) {
        return helpers.error('number.max', { limit: gravida - 1 });
      }
      return value;
    })
    .messages({
      'number.max': 'Para must be less than gravida (current pregnancy is already included in gravida).',
    }),
  notes: Joi.string().max(3000).allow(null, ''),
  // is_high_risk and high_risk_reason are NOT accepted on create.
  // High-risk must go through the dedicated PATCH /high-risk endpoint.
});

/**
 * PUT /api/v1/pregnancies/:id
 * Allows update of allowed clinical fields.
 * EDD adjustment via scan requires override_reason + scan_date (treated as override).
 */
const updatePregnancySchema = Joi.object({
  lmp: Joi.date()
    .iso()
    .max('now')
    .messages({ 'date.max': 'LMP date cannot be in the future.' }),
  gravida: Joi.number().integer().min(1).max(30),
  para: Joi.number().integer().min(0).max(29),
  notes: Joi.string().max(3000).allow(null, ''),
  doctor_id: Joi.string().uuid(),

  // EDD override by scan biometry — requires override_reason and scan_date
  edd_override: Joi.date().iso(),
  edd_override_reason: Joi.string().min(10).max(2000).when('edd_override', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  edd_override_scan_date: Joi.date().iso().when('edd_override', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
})
  .min(1)
  .options({ stripUnknown: true });

/**
 * PATCH /api/v1/pregnancies/:id/high-risk
 * Toggle high-risk flag. override_reason is mandatory.
 */
const highRiskToggleSchema = Joi.object({
  is_high_risk: Joi.boolean().required(),
  high_risk_reason: Joi.string().min(10).max(2000).required(),
  override_note: Joi.string().max(2000).allow(null, ''),
});

/**
 * POST /api/v1/pregnancies/:id/close
 */
const closePregnancySchema = Joi.object({
  status: Joi.string()
    .valid(...CLOSE_STATUS_VALUES)
    .required(),
  closure_reason: Joi.string().min(5).max(2000).required(),
  closure_date: Joi.date().iso().max('now').required(),
  notes: Joi.string().max(3000).allow(null, ''),
});

/**
 * GET /api/v1/patients/:patientId/pregnancies
 */
const listPatientPregnanciesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string()
    .valid('created_at', 'lmp', 'edd', 'status')
    .default('created_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  status: Joi.string().valid(...Object.values(PREGNANCY_STATUS)),
});

/**
 * GET /api/v1/pregnancies/:id/milestones — no body, no query params needed.
 * Included for consistency; validated at controller level.
 */
const getMilestonesSchema = Joi.object({});

module.exports = {
  createPregnancySchema,
  updatePregnancySchema,
  highRiskToggleSchema,
  closePregnancySchema,
  listPatientPregnanciesSchema,
  getMilestonesSchema,
  PREGNANCY_STATUS,
  CLOSE_STATUS_VALUES,
};
