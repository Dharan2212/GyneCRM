const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const documentTypeEnum = ['test_result', 'prescription_pdf', 'scan', 'report', 'consent', 'discharge_summary', 'other'];
const categoryEnum = ['lab', 'radiology', 'consultation', 'pregnancy', 'delivery', 'administrative', 'other'];
const uploadStatusEnum = ['pending', 'uploaded', 'failed'];
const storageProviderEnum = ['local', 's3', 'gcs', 'azure', 'other'];
const { allowedMimeTypes, maxFileSizeBytes } = require('../../middleware/upload-config');

const uploadUrlSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  document_type: Joi.string().trim().valid(...documentTypeEnum).required(),
  original_file_name: Joi.string().trim().min(1).max(255).required(),
  mime_type: Joi.string().trim().lowercase().valid(...allowedMimeTypes).required(),
  file_size_bytes: Joi.number().integer().min(0).max(maxFileSizeBytes).required(),
  test_order_id: objectIdSchema.optional(),
  storage_provider: Joi.string().trim().valid(...storageProviderEnum).optional(),
  storage_bucket: nullableString.max(255).optional(),
});


const reviewInboxQuerySchema = Joi.object({
  doctor_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  review_status: Joi.string().trim().valid('pending', 'reviewed').optional(),
  abnormal_flag: Joi.boolean().optional(),
  ...paginationSchema,
});

const reviewDocumentSchema = Joi.object({
  abnormal_flag: Joi.boolean().optional(),
  findings_summary: nullableString.max(4000).optional(),
  remarks: nullableString.max(4000).optional(),
  action_required: Joi.boolean().optional(),
}).or('abnormal_flag', 'findings_summary', 'remarks', 'action_required');

const flagDocumentSchema = Joi.object({
  abnormal_flag: Joi.boolean().required(),
  remarks: nullableString.max(4000).optional(),
  action_required: Joi.boolean().optional(),
});

const createDocumentSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.optional(),
  consultation_id: objectIdSchema.optional(),
  prescription_id: objectIdSchema.optional(),
  appointment_id: objectIdSchema.optional(),
  test_order_id: objectIdSchema.optional(),
  document_type: Joi.string().trim().valid(...documentTypeEnum).required(),
  category: Joi.string().trim().valid(...categoryEnum).required(),
  title: Joi.string().trim().min(1).max(255).required(),
  description: nullableString.max(4000).optional(),
  tags: Joi.array().items(Joi.string().trim().max(100)).optional(),
  status: Joi.string().trim().valid('active', 'archived', 'superseded').optional(),
  upload_status: Joi.string().trim().valid(...uploadStatusEnum).optional(),
  send_status: Joi.string().trim().valid('not_sent', 'sent').optional(),
  storage_provider: Joi.string().trim().valid(...storageProviderEnum).optional(),
  storage_bucket: nullableString.max(255).optional(),
  storage_key: nullableString.max(500).optional(),
  original_file_name: nullableString.max(255).optional(),
  stored_file_name: nullableString.max(255).optional(),
  mime_type: Joi.string().trim().lowercase().valid(...allowedMimeTypes).allow(null).optional(),
  file_extension: nullableString.max(32).optional(),
  file_size_bytes: Joi.number().integer().min(0).max(maxFileSizeBytes).allow(null).optional(),
  checksum: nullableString.max(255).optional(),
  uploaded_at: nullableDate.optional(),
  clinical_summary: nullableString.max(4000).optional(),
}).required();

const documentDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

module.exports = {
  uploadUrlSchema,
  createDocumentSchema,
  documentDetailSchema,
  reviewInboxQuerySchema,
  reviewDocumentSchema,
  flagDocumentSchema,
};
