'use strict';

const Joi = require('joi');

// ─── Enum constants ───────────────────────────────────────────────────────────

/**
 * Document types reconciled from:
 * - Architecture Part 10.4 (primary)
 * - Roadmap Part 5.6 (execution catalogue)
 */
const DOCUMENT_TYPES = [
  'lab_report',
  'scan_report',
  'ultrasound',
  'scan',
  'prescription_pdf',
  'consultation_summary',
  'consent_form',
  'referral_letter',
  'insurance_document',
  'identity_document',
  'invoice_pdf',
  'other',
];

/**
 * Architecture Part 10.2: accepted MIME types.
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Architecture Part 10.2: max file size 20 MB.
 */
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_FILE_SIZE_KB = 20 * 1024;           // 20 MB in KB

/**
 * Architecture Part 10.2: max files per batch.
 */
const MAX_FILES_PER_BATCH = 5;

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/documents/upload-url
 * Client requests a pre-signed PUT URL before uploading directly to S3.
 */
const getUploadUrlSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  document_type: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .required(),
  mime_type: Joi.string()
    .valid(...ALLOWED_MIME_TYPES)
    .required()
    .messages({ 'any.only': `Unsupported file type. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}` }),
  file_size_bytes: Joi.number()
    .integer()
    .min(1)
    .max(MAX_FILE_SIZE_BYTES)
    .required()
    .messages({ 'number.max': `File size must not exceed 20 MB.` }),
  file_name: Joi.string().max(300).required(),

  // Optional linkage context — validated against DB in service
  pregnancy_id: Joi.string().uuid().allow(null),
  consultation_id: Joi.string().uuid().allow(null),
  test_order_id: Joi.string().uuid().allow(null),
});

/**
 * POST /api/v1/documents
 * Create patient_documents metadata row after client successfully uploads to S3.
 */
const createDocumentSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  document_type: Joi.string().valid(...DOCUMENT_TYPES).required(),
  s3_key: Joi.string().max(1000).required(), // the key returned by upload-url response
  file_name: Joi.string().max(300).required(),
  mime_type: Joi.string().valid(...ALLOWED_MIME_TYPES).required(),
  file_size_bytes: Joi.number().integer().min(1).max(MAX_FILE_SIZE_BYTES).required(),

  // Optional clinical linkages
  pregnancy_id: Joi.string().uuid().allow(null),
  consultation_id: Joi.string().uuid().allow(null),
  test_order_id: Joi.string().uuid().allow(null),

  // Optional document-level metadata
  lab_name: Joi.string().max(200).allow(null, ''),
  test_date: Joi.date().iso().allow(null),
  notes: Joi.string().max(2000).allow(null, ''),
});

/**
 * GET /api/v1/patients/:patientId/documents
 */
const listPatientDocumentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('uploaded_at', 'document_type', 'review_status').default('uploaded_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  document_type: Joi.string().valid(...DOCUMENT_TYPES),
  review_status: Joi.string().valid('pending_review', 'reviewed', 'no_review_required', 'flagged'),
  include_deleted: Joi.boolean().default(false), // Admin only — enforced in service
});

module.exports = {
  getUploadUrlSchema,
  createDocumentSchema,
  listPatientDocumentsSchema,
  DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_KB,
  MAX_FILES_PER_BATCH,
};
