const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const ISSUE_STATUS_ENUM = ['draft', 'issued'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];
const ITEM_STATUS_ENUM = ['active', 'stopped', 'substituted'];
const DURATION_UNIT_ENUM = ['day', 'days', 'week', 'weeks', 'month', 'months'];

const prescriptionItemSchema = Joi.object({
  item_no: Joi.number().integer().min(1).optional(),
  medicine_name: Joi.string().trim().min(1).max(200).required(),
  generic_name: nullableString.max(200).optional(),
  formulation: nullableString.max(120).optional(),
  strength: nullableString.max(120).optional(),
  dose: nullableString.max(120).optional(),
  route: nullableString.max(120).optional(),
  frequency: nullableString.max(120).optional(),
  duration_value: nullableNumber.min(0).optional(),
  duration_unit: Joi.string().trim().valid(...DURATION_UNIT_ENUM).allow(null).optional(),
  quantity: nullableNumber.min(0).optional(),
  instructions: nullableString.max(1000).optional(),
  before_food: Joi.boolean().optional(),
  after_food: Joi.boolean().optional(),
  morning: Joi.boolean().optional(),
  afternoon: Joi.boolean().optional(),
  evening: Joi.boolean().optional(),
  night: Joi.boolean().optional(),
  is_prn: Joi.boolean().optional(),
  prn_reason: nullableString.max(500).optional(),
  notes: nullableString.max(1000).optional(),
  status: Joi.string().trim().valid(...ITEM_STATUS_ENUM).optional(),
});

const createPrescriptionSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.required(),
  consultation_id: objectIdSchema.required(),
  appointment_id: objectIdSchema.optional(),
  prescription_date: Joi.date().iso().optional(),
  diagnosis_summary: nullableString.max(2000).optional(),
  advice_notes: nullableString.max(5000).optional(),
  general_instructions: nullableString.max(5000).optional(),
  items: Joi.array().items(prescriptionItemSchema).min(0).required(),
});

const prescriptionDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const issuePrescriptionSchema = emptyObjectSchema;

const voidPrescriptionSchema = Joi.object({
  void_reason: Joi.string().trim().min(1).max(2000).required(),
});

const prescriptionPdfSchema = Joi.object({
  id: objectIdSchema.required(),
});

const sendPrescriptionSchema = Joi.object({
  send_channels: Joi.array().items(Joi.string().trim().valid(...SEND_CHANNEL_ENUM)).min(1).required(),
  send_notes: nullableString.max(2000).optional(),
});

module.exports = {
  createPrescriptionSchema,
  prescriptionDetailSchema,
  issuePrescriptionSchema,
  voidPrescriptionSchema,
  prescriptionPdfSchema,
  sendPrescriptionSchema,
  ISSUE_STATUS_ENUM,
  SEND_CHANNEL_ENUM,
  ITEM_STATUS_ENUM,
  DURATION_UNIT_ENUM,
};
