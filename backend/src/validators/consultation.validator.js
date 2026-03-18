'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB migrations ───────────────────────────────────

const EDEMA_VALUES = ['none', 'mild', 'moderate', 'severe'];
const URINE_VALUES = ['negative', 'trace', '1+', '2+', '3+', '4+'];
const FETAL_MOVEMENT_VALUES = ['normal', 'reduced', 'absent', 'excessive'];
const PRESENTATION_VALUES = ['cephalic', 'breech', 'transverse', 'oblique'];
const LIQUOR_VALUES = ['adequate', 'reduced', 'increased', 'absent'];

// From Part 9.1 of architecture - consultation outcome types
const CONSULTATION_OUTCOME_VALUES = [
  'advice_only',
  'medicine_prescribed',
  'tests_ordered',
  'follow_up_only',
  'referral',
  'observation',
  'admission_recommended',
];

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

/**
 * Vitals JSONB sub-schema.
 * BMI is NOT accepted from client — it is computed server-side.
 */
const vitalsSchema = Joi.object({
  bp_systolic: Joi.number().integer().min(40).max(300).allow(null),
  bp_diastolic: Joi.number().integer().min(20).max(200).allow(null),
  pulse_rate: Joi.number().integer().min(20).max(300).allow(null),
  temperature: Joi.number().min(30).max(45).allow(null),
  weight_kg: Joi.number().min(0.5).max(600).allow(null),
  height_cm: Joi.number().min(30).max(280).allow(null),
  edema: Joi.string()
    .valid(...EDEMA_VALUES)
    .allow(null),
  urine_protein: Joi.string()
    .valid(...URINE_VALUES)
    .allow(null),
  urine_sugar: Joi.string()
    .valid(...URINE_VALUES)
    .allow(null),
}).options({ stripUnknown: true });

/**
 * Obstetric observations JSONB sub-schema.
 * trimester is NOT accepted from client — it is derived server-side.
 */
const obstetricObsSchema = Joi.object({
  fetal_heart_rate: Joi.number().integer().min(50).max(250).allow(null),
  fetal_movement: Joi.string()
    .valid(...FETAL_MOVEMENT_VALUES)
    .allow(null),
  fundal_height_cm: Joi.number().min(0).max(60).allow(null),
  presentation: Joi.string()
    .valid(...PRESENTATION_VALUES)
    .allow(null),
  liquor: Joi.string()
    .valid(...LIQUOR_VALUES)
    .allow(null),
  contractions: Joi.boolean().allow(null),
  vaginal_bleeding: Joi.boolean().allow(null),
  vaginal_discharge: Joi.string().max(1000).allow(null, ''),
  abdominal_pain: Joi.boolean().allow(null),
  previous_scan_reviewed: Joi.boolean().allow(null),
}).options({ stripUnknown: true });

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/consultations
 */
const createConsultationSchema = Joi.object({
  appointment_id: Joi.string().uuid().required(),
  pregnancy_id: Joi.string().uuid().allow(null),

  // Vitals
  vitals: vitalsSchema.allow(null),

  // Obstetric observations (pregnancy visits)
  obstetric_obs: obstetricObsSchema.allow(null),

  // Clinical fields
  symptoms: Joi.string().max(5000).allow(null, ''),
  diagnosis_tags: Joi.array().items(Joi.string().max(200)).max(50).allow(null),
  diagnosis_notes: Joi.string().max(5000).allow(null, ''),
  high_risk_update: Joi.boolean().allow(null),
  treatment_plan: Joi.string().max(5000).allow(null, ''),
  doctor_notes: Joi.string().max(5000).allow(null, ''),
  report_reviewed: Joi.boolean().allow(null),
  referred_to: Joi.string().max(500).allow(null, ''),
  milestone_impact: Joi.string().max(1000).allow(null, ''),
  consultation_outcome: Joi.string()
    .valid(...CONSULTATION_OUTCOME_VALUES)
    .allow(null),
});

/**
 * PUT /api/v1/consultations/:id
 * At least one field must be provided.
 */
const updateConsultationSchema = Joi.object({
  pregnancy_id: Joi.string().uuid().allow(null),
  vitals: vitalsSchema.allow(null),
  obstetric_obs: obstetricObsSchema.allow(null),
  symptoms: Joi.string().max(5000).allow(null, ''),
  diagnosis_tags: Joi.array().items(Joi.string().max(200)).max(50).allow(null),
  diagnosis_notes: Joi.string().max(5000).allow(null, ''),
  high_risk_update: Joi.boolean().allow(null),
  treatment_plan: Joi.string().max(5000).allow(null, ''),
  doctor_notes: Joi.string().max(5000).allow(null, ''),
  report_reviewed: Joi.boolean().allow(null),
  referred_to: Joi.string().max(500).allow(null, ''),
  milestone_impact: Joi.string().max(1000).allow(null, ''),
  consultation_outcome: Joi.string()
    .valid(...CONSULTATION_OUTCOME_VALUES)
    .allow(null),
})
  .min(1)
  .options({ stripUnknown: true });

/**
 * POST /api/v1/consultations/:id/finalize
 * No extra body fields required; finalisation is a state transition.
 * Optional: doctor can provide final outcome on finalize.
 */
const finalizeConsultationSchema = Joi.object({
  consultation_outcome: Joi.string()
    .valid(...CONSULTATION_OUTCOME_VALUES)
    .required(),
});

/**
 * POST /api/v1/consultations/:id/override
 * override_reason is mandatory + at least one clinical field.
 */
const overrideConsultationSchema = Joi.object({
  override_reason: Joi.string().min(10).max(2000).required(),

  // At least one of the following fields must be provided alongside reason
  vitals: vitalsSchema.allow(null),
  obstetric_obs: obstetricObsSchema.allow(null),
  symptoms: Joi.string().max(5000).allow(null, ''),
  diagnosis_tags: Joi.array().items(Joi.string().max(200)).max(50).allow(null),
  diagnosis_notes: Joi.string().max(5000).allow(null, ''),
  high_risk_update: Joi.boolean().allow(null),
  treatment_plan: Joi.string().max(5000).allow(null, ''),
  doctor_notes: Joi.string().max(5000).allow(null, ''),
  report_reviewed: Joi.boolean().allow(null),
  referred_to: Joi.string().max(500).allow(null, ''),
  milestone_impact: Joi.string().max(1000).allow(null, ''),
  consultation_outcome: Joi.string()
    .valid(...CONSULTATION_OUTCOME_VALUES)
    .allow(null),
})
  .options({ stripUnknown: true })
  .custom((value, helpers) => {
    // Must have at least one clinical field beyond override_reason
    const clinicalFields = Object.keys(value).filter((k) => k !== 'override_reason');
    if (clinicalFields.length === 0) {
      return helpers.error('any.custom', {
        message: 'At least one clinical field must be provided for override.',
      });
    }
    return value;
  });

// ─── List query schema ────────────────────────────────────────────────────────

const listPatientConsultationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string()
    .valid('created_at', 'finalized_at', 'consultation_outcome')
    .default('created_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  is_finalized: Joi.boolean(),
});

module.exports = {
  createConsultationSchema,
  updateConsultationSchema,
  finalizeConsultationSchema,
  overrideConsultationSchema,
  listPatientConsultationsSchema,
  CONSULTATION_OUTCOME_VALUES,
};
