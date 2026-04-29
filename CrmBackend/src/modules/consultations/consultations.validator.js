const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const CONSULTATION_STATUS_ENUM = ['draft', 'in_progress', 'completed', 'finalised'];
const WRITABLE_STATUS_ENUM = ['draft', 'in_progress', 'completed'];
const FOLLOW_UP_STATUS_ENUM = ['pending', 'completed', 'cancelled', 'missed'];
const FOLLOW_UP_STATUS_UPDATE_ENUM = ['completed', 'cancelled', 'missed'];
const FOLLOW_UP_PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];

const vitalsSchema = Joi.object({
  height_cm: nullableNumber.min(0).optional(),
  weight_kg: nullableNumber.min(0).optional(),
  bmi: nullableNumber.min(0).optional(),
  blood_pressure: nullableString.max(50).optional(),
  pulse: nullableNumber.min(0).optional(),
  temperature_c: nullableNumber.min(0).optional(),
  spo2: nullableNumber.min(0).max(100).optional(),
  respiratory_rate: nullableNumber.min(0).optional(),
}).optional();

const examinationSchema = Joi.object({
  general_examination: nullableString.max(2000).optional(),
  systemic_examination: nullableString.max(2000).optional(),
  abdominal_examination: nullableString.max(2000).optional(),
  pelvic_examination: nullableString.max(2000).optional(),
  notes: nullableString.max(2000).optional(),
}).optional();

const diagnosisSchema = Joi.object({
  primary: nullableString.max(500).optional(),
  secondary: Joi.array().items(Joi.string().trim().max(500)).optional(),
  notes: nullableString.max(2000).optional(),
}).optional();

function validateFollowUpConsistency(value, helpers) {
  if (value.follow_up_required === true && !value.follow_up_date) {
    return helpers.message('follow_up_date is required when follow_up_required is true.');
  }

  return value;
}

const createConsultationSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.required(),
  appointment_id: objectIdSchema.optional(),
  chief_complaint: nullableString.max(2000).optional(),
  history_of_present_illness: nullableString.max(5000).optional(),
  vitals: vitalsSchema,
  examination: examinationSchema,
  diagnosis: diagnosisSchema,
  provisional_diagnosis: nullableString.max(2000).optional(),
  advice: nullableString.max(5000).optional(),
  notes: nullableString.max(5000).optional(),
  follow_up_required: Joi.boolean().optional(),
  follow_up_date: Joi.date().iso().allow(null).optional(),
}).custom(validateFollowUpConsistency);

const consultationDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updateConsultationSchema = Joi.object({
  chief_complaint: nullableString.max(2000).optional(),
  history_of_present_illness: nullableString.max(5000).optional(),
  vitals: vitalsSchema,
  examination: examinationSchema,
  diagnosis: diagnosisSchema,
  provisional_diagnosis: nullableString.max(2000).optional(),
  advice: nullableString.max(5000).optional(),
  notes: nullableString.max(5000).optional(),
  follow_up_required: Joi.boolean().optional(),
  follow_up_date: Joi.date().iso().allow(null).optional(),
}).min(1).custom(validateFollowUpConsistency);

const updateConsultationStatusSchema = Joi.object({
  status: Joi.string().trim().valid(...WRITABLE_STATUS_ENUM).required(),
});

const finaliseConsultationSchema = Joi.object({
  follow_up_required: Joi.boolean().optional(),
  follow_up_date: Joi.date().iso().allow(null).optional(),
  follow_up_reason: nullableString.max(2000).optional(),
  follow_up_notes: nullableString.max(5000).optional(),
  follow_up_priority: Joi.string().trim().valid(...FOLLOW_UP_PRIORITY_ENUM).optional(),
}).custom(validateFollowUpConsistency);

const consultationWorkspaceSchema = Joi.object({
  id: objectIdSchema.required(),
});

const followUpListQuerySchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...FOLLOW_UP_STATUS_ENUM).optional(),
  patient_id: objectIdSchema.optional(),
  doctor_id: objectIdSchema.optional(),
  due_from: Joi.date().iso().optional(),
  due_to: Joi.date().iso().optional(),
  priority: Joi.string().trim().valid(...FOLLOW_UP_PRIORITY_ENUM).optional(),
  ...paginationSchema,
});

const consultationFollowUpSchema = Joi.object({
  id: objectIdSchema.required(),
});

const followUpStatusParamsSchema = Joi.object({
  id: objectIdSchema.required(),
});

const followUpStatusUpdateSchema = Joi.object({
  status: Joi.string().trim().valid(...FOLLOW_UP_STATUS_UPDATE_ENUM).required(),
  notes: nullableString.max(5000).optional(),
  cancellation_reason: nullableString.max(2000).optional(),
});

module.exports = {
  createConsultationSchema,
  consultationDetailSchema,
  updateConsultationSchema,
  updateConsultationStatusSchema,
  finaliseConsultationSchema,
  consultationWorkspaceSchema,
  followUpListQuerySchema,
  consultationFollowUpSchema,
  followUpStatusParamsSchema,
  followUpStatusUpdateSchema,
  CONSULTATION_STATUS_ENUM,
  WRITABLE_STATUS_ENUM,
  FOLLOW_UP_STATUS_ENUM,
  FOLLOW_UP_STATUS_UPDATE_ENUM,
  FOLLOW_UP_PRIORITY_ENUM,
};
