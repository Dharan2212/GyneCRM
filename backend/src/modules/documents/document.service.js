'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const documentRepo = require('./document.repository');
const { generateUploadUrl, generateDownloadUrl } = require('../../utils/s3-helper');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const logger = require('../../utils/logger');
const {
  DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} = require('../../validators/document.validator');

// ─── Role-based upload permission map ────────────────────────────────────────
//
// Architecture Part 10.3 (primary) + Part 5.6 (execution detail):
//   Admin      → all document types
//   Receptionist → lab_report, scan_report, consent_form, identity_document
//   Staff       → lab_report, scan_report
//   Doctor      → NO upload permission (view/download only)
//
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_PERMISSIONS = {
  admin: DOCUMENT_TYPES, // all types
  receptionist: ['lab_report', 'scan_report', 'consent_form', 'identity_document'],
  staff: ['lab_report', 'scan_report'],
  doctor: [], // no upload permission
};

/**
 * Role-based view/download permission:
 *   Admin       → all (including soft-deleted)
 *   Doctor      → all (for own patients) — enforced at patient scope level
 *   Receptionist → view all
 *   Staff       → cannot view/download
 */
const VIEW_ROLES = ['admin', 'doctor', 'receptionist'];

// ─── Review status default logic ─────────────────────────────────────────────

/**
 * Determine default review_status for a newly uploaded document.
 * Clinical upload types require doctor review.
 * System-generated PDFs and non-clinical types do not.
 */
function defaultReviewStatus(documentType) {
  const REQUIRES_REVIEW = ['lab_report', 'scan_report', 'ultrasound', 'scan'];
  return REQUIRES_REVIEW.includes(documentType) ? 'pending_review' : 'no_review_required';
}

// ─── MIME to extension map ────────────────────────────────────────────────────

const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Build the S3 key for a document upload.
 * Architecture Part 10.1: {hospital_id}/{patient_id}/{year}/{month}/{uuid}.{ext}
 */
function buildS3Key(hospitalId, patientId, mimeType) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ext = MIME_TO_EXT[mimeType] || 'bin';
  const fileUuid = uuidv4();
  return `${hospitalId}/${patientId}/${year}/${month}/${fileUuid}.${ext}`;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Generate a pre-signed S3 PUT URL for client-side direct upload.
 *
 * Architecture Part 3.5: generateUploadUrl() TTL = 15 minutes.
 * Architecture Part 10.2: MIME + size validation enforced here.
 *
 * Workflow:
 * 1. Validate role has upload permission for the requested document_type
 * 2. Validate patient belongs to hospital
 * 3. Validate optional linkage IDs (consultation, pregnancy, test_order)
 * 4. Generate S3 key per architecture pattern
 * 5. Return pre-signed PUT URL + s3_key for client to use in POST /documents after upload
 */
async function getUploadUrl(data, actor) {
  const {
    patient_id,
    document_type,
    mime_type,
    file_size_bytes,
    file_name,
    pregnancy_id,
    consultation_id,
    test_order_id,
  } = data;
  const { userId, hospitalId, role } = actor;

  // 1. Role permission check
  const allowedTypes = UPLOAD_PERMISSIONS[role] || [];
  if (!allowedTypes.includes(document_type)) {
    const err = new Error(
      `Role '${role}' does not have permission to upload '${document_type}' documents.`
    );
    err.statusCode = 403;
    err.code = 'UPLOAD_PERMISSION_DENIED';
    throw err;
  }

  // 2. MIME type validation (defence-in-depth beyond Joi)
  if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
    const err = new Error(`File type '${mime_type}' is not accepted.`);
    err.statusCode = 400;
    err.code = 'INVALID_MIME_TYPE';
    throw err;
  }

  // 3. File size validation
  if (file_size_bytes > MAX_FILE_SIZE_BYTES) {
    const err = new Error('File size exceeds the 20 MB limit.');
    err.statusCode = 400;
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }

  // 4. Validate patient belongs to hospital
  const patient = await documentRepo.findPatientById(patient_id, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.');
    err.statusCode = 404;
    err.code = 'PATIENT_NOT_FOUND';
    throw err;
  }

  // 5. Validate optional linkage IDs
  if (consultation_id) {
    const consultation = await documentRepo.findConsultationById(consultation_id, hospitalId);
    if (!consultation) {
      const err = new Error('Consultation not found.'); err.statusCode = 404; err.code = 'CONSULTATION_NOT_FOUND'; throw err;
    }
    if (consultation.patient_id !== patient_id) {
      const err = new Error('Consultation does not belong to the specified patient.'); err.statusCode = 422; err.code = 'PATIENT_CONSULTATION_MISMATCH'; throw err;
    }
  }

  if (pregnancy_id) {
    const pregnancy = await documentRepo.findPregnancyById(pregnancy_id, hospitalId);
    if (!pregnancy) {
      const err = new Error('Pregnancy record not found.'); err.statusCode = 404; err.code = 'PREGNANCY_NOT_FOUND'; throw err;
    }
    if (pregnancy.patient_id !== patient_id) {
      const err = new Error('Pregnancy does not belong to the specified patient.'); err.statusCode = 422; err.code = 'PATIENT_PREGNANCY_MISMATCH'; throw err;
    }
  }

  if (test_order_id) {
    const testOrder = await documentRepo.findTestOrderById(test_order_id, patient_id);
    if (!testOrder) {
      const err = new Error('Test order not found or does not belong to the specified patient.'); err.statusCode = 404; err.code = 'TEST_ORDER_NOT_FOUND'; throw err;
    }
  }

  // 6. Generate S3 key

  // 7. Generate pre-signed PUT URL (TTL: 15 minutes per architecture Part 3.5)
  const { uploadUrl, s3Key } = await generateUploadUrl({ hospitalId, patientId: patient_id, mimeType: mime_type, fileSizeBytes: file_size_bytes });

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_UPLOAD_URL_GENERATED',
    entityType: 'patient_documents',
    entityId: patient_id,
    meta: { document_type, mime_type, file_name, s3_key: s3Key },
  });

  return {
    upload_url: uploadUrl,
    s3_key: s3Key,
    expires_in_seconds: 900, // 15 minutes
    document_type,
    patient_id,
  };
}

/**
 * Create a patient_documents metadata record after the client has
 * successfully uploaded the file to S3.
 *
 * The client must confirm the S3 key (returned by getUploadUrl) and
 * provide final metadata (file_name, size, MIME, type, linkages).
 *
 * Architecture: DB write happens after successful S3 upload, not before.
 */
async function createDocumentRecord(data, actor) {
  const {
    patient_id,
    document_type,
    s3_key,
    file_name,
    mime_type,
    file_size_bytes,
    pregnancy_id,
    consultation_id,
    test_order_id,
    lab_name,
    test_date,
    notes,
  } = data;
  const { userId, hospitalId } = actor;

  // Validate patient belongs to hospital
  const patient = await documentRepo.findPatientById(patient_id, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  // Validate optional linkage IDs (same as upload-url validation for consistency)
  if (consultation_id) {
    const consultation = await documentRepo.findConsultationById(consultation_id, hospitalId);
    if (!consultation || consultation.patient_id !== patient_id) {
      const err = new Error('Consultation not found or patient mismatch.'); err.statusCode = 422; err.code = 'CONSULTATION_MISMATCH'; throw err;
    }
  }
  if (pregnancy_id) {
    const pregnancy = await documentRepo.findPregnancyById(pregnancy_id, hospitalId);
    if (!pregnancy || pregnancy.patient_id !== patient_id) {
      const err = new Error('Pregnancy not found or patient mismatch.'); err.statusCode = 422; err.code = 'PREGNANCY_MISMATCH'; throw err;
    }
  }
  if (test_order_id) {
    const testOrder = await documentRepo.findTestOrderById(test_order_id, patient_id);
    if (!testOrder) {
      const err = new Error('Test order not found or does not belong to the specified patient.'); err.statusCode = 404; err.code = 'TEST_ORDER_NOT_FOUND'; throw err;
    }
  }

  // Determine review_status based on document type
  const reviewStatus = defaultReviewStatus(document_type);

  const document = await documentRepo.create({
    patient_id,
    hospital_id: hospitalId,
    document_type,
    s3_key,
    // Alias: architecture uses file_url (TEXT) — stored as s3_key in migration 033
    file_name,
    mime_type,
    file_size_bytes,
    file_size_kb: Math.ceil(file_size_bytes / 1024),
    uploaded_by: userId,
    uploaded_at: new Date(),
    pregnancy_id: pregnancy_id || null,
    consultation_id: consultation_id || null,
    linked_test_order_id: test_order_id || null,
    lab_name: lab_name || null,
    test_date: test_date || null,
    review_status: reviewStatus,
    reviewed_by: null,
    reviewed_at: null,
    abnormal_flag: false,
    review_notes: null,
    extracted_key_values: null,
    is_deleted: false,
    deleted_by: null,
    deleted_reason: null,
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_CREATED',
    entityType: 'patient_documents',
    entityId: document.id,
    meta: {
      document_type,
      patient_id,
      review_status: reviewStatus,
      file_name,
      s3_key,
    },
  });

  logger.info(`Document record created: ${document.id} type=${document_type} patient=${patient_id}`);
  return document;
}

/**
 * List all documents for a patient.
 * Admin can view soft-deleted documents; other roles cannot.
 */
async function listPatientDocuments(patientId, queryParams, actor) {
  const { hospitalId, role } = actor;

  const patient = await documentRepo.findPatientById(patientId, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  // Only admin may request include_deleted=true
  const includeDeleted = role === 'admin' && queryParams.include_deleted === true;

  const {
    page,
    limit,
    sort_by: sortBy,
    sort_dir: sortDir,
    document_type: documentType,
    review_status: reviewStatus,
  } = queryParams;

  return documentRepo.findAllByPatient(patientId, hospitalId, {
    page,
    limit,
    sortBy,
    sortDir,
    documentType,
    reviewStatus,
    includeDeleted,
  });
}

/**
 * Get document metadata + generate a pre-signed GET URL.
 *
 * Architecture Part 10.1: TTL = 15 minutes for read path.
 * Architecture Part 3.5: generateDownloadUrl() TTL = 30 minutes.
 * Using 30 minutes per s3Helper convention (Part 3.5 takes precedence for URL TTL).
 *
 * Every URL generation is logged per architecture Part 10.1 download audit requirement.
 */
async function getDocumentAccessUrl(id, actor) {
  const { hospitalId, userId, role } = actor;

  // Staff cannot view/download
  if (!VIEW_ROLES.includes(role)) {
    const err = new Error('Your role does not have document download permission.');
    err.statusCode = 403;
    err.code = 'DOWNLOAD_PERMISSION_DENIED';
    throw err;
  }

  // Admin can see soft-deleted; others cannot
  const includeSoftDeleted = role === 'admin';
  const document = await documentRepo.findById(id, hospitalId, includeSoftDeleted);

  if (!document) {
    const err = new Error('Document not found.'); err.statusCode = 404; err.code = 'DOCUMENT_NOT_FOUND'; throw err;
  }

  // Soft-deleted documents are visible to admin only with a warning flag
  if (document.is_deleted && role !== 'admin') {
    const err = new Error('Document not found.'); err.statusCode = 404; err.code = 'DOCUMENT_NOT_FOUND'; throw err;
  }

  // Generate pre-signed GET URL (30-min TTL per architecture Part 3.5)
  const { downloadUrl: presignedUrl } = await generateDownloadUrl(document.s3_key, hospitalId, id, userId, 'documents', 'patient_document');

  // Download audit log — every URL generation must be logged (architecture Part 10.1)
  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_ACCESSED',
    entityType: 'patient_documents',
    entityId: id,
    meta: {
      access_type: 'download',
      document_type: document.document_type,
      patient_id: document.patient_id,
      s3_key: document.s3_key,
    },
  });

  return {
    ...document,
    presigned_url: presignedUrl,
    url_expires_in_seconds: 1800,
    url_expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
  };
}

module.exports = {
  getUploadUrl,
  createDocumentRecord,
  listPatientDocuments,
  getDocumentAccessUrl,
  // Exported constants for reuse in other modules
  UPLOAD_PERMISSIONS,
  VIEW_ROLES,
  defaultReviewStatus,
  buildS3Key,
};
