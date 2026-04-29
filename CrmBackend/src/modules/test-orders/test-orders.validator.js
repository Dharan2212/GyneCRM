const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];
const PRIORITY_ENUM = ['routine', 'urgent', 'stat'];
const REVIEW_STATUS_ENUM = ['reviewed'];
const REVIEW_INBOX_STATUS_ENUM = ['uploaded', 'pending_review', 'reviewed', 'sent'];


const TEST_ORDER_STATUS_ENUM = ['ordered', 'pending_upload', 'pending_review', 'reviewed', 'sent', 'cancelled'];

const listTestOrdersQuerySchema = Joi.object({
  doctor_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  consultation_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...TEST_ORDER_STATUS_ENUM).optional(),
  priority: Joi.string().trim().valid(...PRIORITY_ENUM).optional(),
  ordered_from: Joi.date().iso().optional(),
  ordered_to: Joi.date().iso().optional(),
  abnormal_flag: Joi.boolean().optional(),
  ...paginationSchema,
});

const pendingUploadListQuerySchema = Joi.object({
  doctor_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  priority: Joi.string().trim().valid(...PRIORITY_ENUM).optional(),
  ordered_from: Joi.date().iso().optional(),
  ordered_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const createTestOrderSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.required(),
  consultation_id: objectIdSchema.required(),
  prescription_id: objectIdSchema.optional(),
  appointment_id: objectIdSchema.optional(),
  test_catalog_id: objectIdSchema.required(),
  priority: Joi.string().trim().valid(...PRIORITY_ENUM).optional(),
  clinical_notes: nullableString.max(4000).optional(),
  indication: nullableString.max(2000).optional(),
  specimen_type: nullableString.max(500).optional(),
  expected_upload_at: nullableDate.optional(),
});

const testOrderIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const pendingUploadSchema = emptyObjectSchema;

const linkResultSchema = Joi.object({
  document_id: objectIdSchema.required(),
}).required();

const reviewInboxQuerySchema = Joi.object({
  doctor_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...REVIEW_INBOX_STATUS_ENUM).optional(),
  abnormal_flag: Joi.boolean().optional(),
  due_from: Joi.date().iso().optional(),
  due_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const reviewResultSchema = Joi.object({
  abnormal_flag: Joi.boolean().optional(),
  findings_summary: nullableString.max(4000).optional(),
  remarks: nullableString.max(4000).optional(),
  action_required: Joi.boolean().optional(),
  result_summary: nullableString.max(4000).optional(),
}).or('abnormal_flag', 'findings_summary', 'remarks', 'action_required', 'result_summary');

const sendResultSchema = Joi.object({
  send_channels: Joi.array().items(Joi.string().trim().valid(...SEND_CHANNEL_ENUM)).min(1).required(),
  send_notes: nullableString.max(2000).optional(),
});

module.exports = {
  listTestOrdersQuerySchema,
  pendingUploadListQuerySchema,
  createTestOrderSchema,
  testOrderIdParamSchema,
  pendingUploadSchema,
  linkResultSchema,
  reviewInboxQuerySchema,
  reviewResultSchema,
  sendResultSchema,
};
