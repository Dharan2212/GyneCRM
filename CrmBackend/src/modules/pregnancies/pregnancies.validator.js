const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const PREGNANCY_STATUS_ENUM = ['active', 'delivered', 'aborted', 'ectopic', 'transferred', 'closed'];
const CONCEPTION_TYPE_ENUM = ['spontaneous', 'assisted', 'ivf', 'unknown'];
const RH_FACTOR_ENUM = ['positive', 'negative', 'unknown'];
const MILESTONE_STATUS_ENUM = ['pending', 'completed', 'skipped'];

const highRiskFlagSchema = Joi.object({
  code: nullableString.max(100).optional(),
  label: nullableString.max(200).optional(),
  notes: nullableString.max(2000).optional(),
});

const milestoneSchema = Joi.object({
  code: Joi.string().trim().max(100).required(),
  title: nullableString.max(200).optional(),
  target_week: Joi.number().integer().min(0).allow(null).optional(),
  actual_date: Joi.date().iso().allow(null).optional(),
  status: Joi.string().trim().valid(...MILESTONE_STATUS_ENUM).optional(),
  notes: nullableString.max(2000).optional(),
});

function validatePregnancyDateConsistency(value, helpers) {
  if (!value.lmp_date && !value.edd) {
    return helpers.message('Either lmp_date or edd is required.');
  }

  return value;
}

function validateHighRiskConsistency(value, helpers) {
  if (value.high_risk === false && value.high_risk_flags && value.high_risk_flags.length > 0) {
    return helpers.message('high_risk_flags must be empty when high_risk is false.');
  }

  return value;
}

function validateUniqueMilestoneCodes(value, helpers) {
  const codes = (value.milestones || []).map((item) => item.code);
  const uniqueCodes = new Set(codes);

  if (codes.length !== uniqueCodes.size) {
    return helpers.message('Milestone codes must be unique within one request.');
  }

  return value;
}

const createPregnancySchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.required(),
  source_consultation_id: objectIdSchema.optional(),
  pregnancy_number: Joi.number().integer().min(1).optional(),
  conception_type: Joi.string().trim().valid(...CONCEPTION_TYPE_ENUM).optional(),
  lmp_date: Joi.date().iso().allow(null).optional(),
  edd: Joi.date().iso().allow(null).optional(),
  gravida: Joi.number().integer().min(0).allow(null).optional(),
  para: Joi.number().integer().min(0).allow(null).optional(),
  abortions: Joi.number().integer().min(0).allow(null).optional(),
  living_children: Joi.number().integer().min(0).allow(null).optional(),
  pregnancy_notes: nullableString.max(5000).optional(),
  current_weight_kg: nullableNumber.min(0).optional(),
  pre_pregnancy_weight_kg: nullableNumber.min(0).optional(),
  blood_group: nullableString.max(10).optional(),
  rh_factor: Joi.string().trim().valid(...RH_FACTOR_ENUM).optional(),
  high_risk: Joi.boolean().optional(),
  high_risk_flags: Joi.array().items(highRiskFlagSchema).optional(),
  high_risk_notes: nullableString.max(5000).optional(),
  milestones: Joi.array().items(milestoneSchema).optional(),
}).custom(validatePregnancyDateConsistency).custom(validateHighRiskConsistency).custom(validateUniqueMilestoneCodes);

const pregnancyDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updatePregnancySchema = Joi.object({
  pregnancy_number: Joi.number().integer().min(1).optional(),
  conception_type: Joi.string().trim().valid(...CONCEPTION_TYPE_ENUM).optional(),
  lmp_date: Joi.date().iso().allow(null).optional(),
  edd: Joi.date().iso().allow(null).optional(),
  gravida: Joi.number().integer().min(0).allow(null).optional(),
  para: Joi.number().integer().min(0).allow(null).optional(),
  abortions: Joi.number().integer().min(0).allow(null).optional(),
  living_children: Joi.number().integer().min(0).allow(null).optional(),
  pregnancy_notes: nullableString.max(5000).optional(),
  current_weight_kg: nullableNumber.min(0).optional(),
  pre_pregnancy_weight_kg: nullableNumber.min(0).optional(),
  blood_group: nullableString.max(10).optional(),
  rh_factor: Joi.string().trim().valid(...RH_FACTOR_ENUM).optional(),
  status: Joi.string().trim().valid(...PREGNANCY_STATUS_ENUM).optional(),
}).min(1);

const highRiskUpdateSchema = Joi.object({
  high_risk: Joi.boolean().required(),
  high_risk_flags: Joi.array().items(highRiskFlagSchema).optional(),
  high_risk_notes: nullableString.max(5000).optional(),
}).custom(validateHighRiskConsistency);

const milestoneUpdateSchema = Joi.object({
  milestones: Joi.array().items(milestoneSchema).min(1).required(),
}).custom(validateUniqueMilestoneCodes);

const milestoneStatusParamsSchema = Joi.object({
  id: objectIdSchema.required(),
  milestoneCode: Joi.string().trim().max(100).required(),
});

const milestoneStatusUpdateSchema = Joi.object({
  status: Joi.string().trim().valid(...MILESTONE_STATUS_ENUM).required(),
  actual_date: Joi.date().iso().allow(null).optional(),
  notes: nullableString.max(2000).optional(),
});

module.exports = {
  createPregnancySchema,
  pregnancyDetailSchema,
  updatePregnancySchema,
  highRiskUpdateSchema,
  milestoneUpdateSchema,
  milestoneStatusParamsSchema,
  milestoneStatusUpdateSchema,
};
