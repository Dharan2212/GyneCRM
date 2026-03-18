'use strict';

/**
 * S3 Helper — GyneCRM pre-signed URL and object validation utilities.
 *
 * SCOPE: This helper is a GENERAL S3 utility for all locked storage columns
 * in the Phase 2 schema. It is not restricted to patient documents. It covers:
 *
 *   patient_documents.s3_key        — patient-uploaded files (generateUploadUrl / validateUpload)
 *   prescriptions.pdf_url           — server-generated PDFs (generateDownloadUrl only; upload is server-to-S3 via SDK)
 *   hospitals.logo_url              — hospital logo (generateDownloadUrl)
 *   doctors.signature_url           — doctor signature image (generateDownloadUrl)
 *
 * UPLOAD FLOW (Phase 2 Section 14.1 — locked):
 *   Patient documents only: direct-to-S3 upload via pre-signed PUT URL.
 *   1. Caller → backend: POST /api/v1/documents/upload-url
 *   2. Backend → caller: { uploadUrl, s3Key, expiresAt }   (generateUploadUrl)
 *   3. Caller → S3:      PUT {uploadUrl} with file bytes
 *   4. Caller → backend: POST /api/v1/documents/confirm { s3Key }
 *   5. Backend → S3:     HEAD {s3Key}                      (validateUpload)
 *   6. Backend: stores s3_key in patient_documents row
 *
 *   Server-generated files (PDFs) upload directly via AWS SDK — they do NOT
 *   use generateUploadUrl. Access to all stored files uses generateDownloadUrl.
 *
 * SECURITY CONTRACT:
 *   - Bucket is PRIVATE. No public URLs are ever generated.
 *   - All file access is served via pre-signed GET URLs (15-minute TTL).
 *   - Every generateDownloadUrl call is logged to activity_logs (Phase 2 Section 14.2).
 *   - Physical S3 deletion is PROHIBITED in MVP. deleteFile returns a soft-delete
 *     instruction object; the document module acts on it.
 *
 * ALLOWED MIME TYPES (Phase 3 locked — Roadmap Section 3.5):
 *   PDF, JPEG, PNG only. DICOM is future scope. All other types rejected.
 *
 * Authority:
 *   - GyneCRM Master Development Roadmap Sections 3.5, 1.5
 *   - Phase 2 DB Spec Sections 14.1–14.4 (locked)
 */

const { randomUUID }       = require('crypto');
const {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
}                          = require('@aws-sdk/client-s3');
const { getSignedUrl }     = require('@aws-sdk/s3-request-presigner');

const { s3Client }         = require('../config/s3');    // ← named export { s3Client } from Batch 1
const env                  = require('../config/env');   // ← nested config object from Batch 1
const { db }               = require('../db/connection'); // ← named export { db } from Batch 1
const logger               = require('./logger');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Pre-signed URL TTL values sourced from env.s3 config (Batch 1 locked shape).
 * Upload TTL:   env.s3.uploadUrlExpirySeconds
 * Download TTL: env.s3.downloadUrlExpirySeconds
 * Both are configured per-environment in src/config/env.js.
 */
const UPLOAD_URL_EXPIRY_SECONDS   = env.s3.uploadUrlExpirySeconds;
const DOWNLOAD_URL_EXPIRY_SECONDS = env.s3.downloadUrlExpirySeconds;

/**
 * Allowed MIME types for patient document uploads.
 * Locked: PDF, JPG, PNG only (Phase 3 — Roadmap Section 3.5).
 * DICOM is listed as future scope and is NOT included in MVP.
 * WEBP, DOC, DOCX are NOT in the locked allowed list and are excluded.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',   // non-standard alias; included for client compatibility
  'image/png',
]);

/**
 * MIME type → file extension mapping for S3 key construction.
 * Covers only the locked allowed types.
 */
const MIME_TO_EXT = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg':      'jpg',
  'image/jpg':       'jpg',
  'image/png':       'png',
});

/**
 * Maximum upload file size in bytes.
 * Source: env.s3.maxFileSizeMb from nested Batch 1 config.
 * Fallback: 20 MB (Roadmap Section 1.5 default).
 */
const MAX_FILE_SIZE_BYTES = (Number(env.s3.maxFileSizeMb) || 20) * 1024 * 1024;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Builds the locked S3 key for a patient document.
 * Pattern: {hospital_id}/{patient_id}/{year}/{month}/{uuid}.{ext}
 *
 * This structure enforces hospital-level isolation, time-bucketed archiving,
 * and UUID-based enumeration prevention (Phase 2 Section 14.4).
 *
 * Used for: patient_documents.s3_key (patient uploads only)
 * The same UUID-based key pattern is used by the prescription PDF generator
 * server-side, but that path is managed by the prescription service, not here.
 *
 * @param {string} hospitalId  - UUID string (no dashes stripped — used as-is)
 * @param {string} patientId   - UUID string
 * @param {string} fileExt     - Without leading dot, e.g. 'pdf', 'jpg'
 * @returns {string}
 */
function buildPatientDocS3Key(hospitalId, patientId, fileExt) {
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const uuid  = randomUUID();
  const ext   = fileExt.toLowerCase().replace(/^\./, '');
  return `${hospitalId}/${patientId}/${year}/${month}/${uuid}.${ext}`;
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Generates a pre-signed S3 PUT URL for a direct-to-S3 patient document upload.
 *
 * ONLY for patient document uploads (patient_documents.s3_key pattern).
 * Server-generated files (prescription PDFs, etc.) use the AWS SDK directly
 * and do not go through this function.
 *
 * Enforces:
 *   - MIME type must be in the locked allowed set (PDF, JPEG, PNG)
 *   - File size must not exceed env.s3.maxFileSizeMb
 *   - S3 key is generated here and returned for the client to use as the PUT target
 *   - URL expires in 15 minutes (Phase 2 Section 14.1 locked)
 *
 * @param {object} params
 * @param {string}  params.hospitalId     - UUID of the hospital (used in S3 key + scoping)
 * @param {string}  params.patientId      - UUID of the patient (used in S3 key)
 * @param {string}  params.mimeType       - MIME type of the file being uploaded
 * @param {string}  [params.fileExt]      - File extension override (e.g. 'pdf'). Derived from mimeType if omitted.
 * @param {number}  params.fileSizeBytes  - File size in bytes (validated before URL generation)
 *
 * @returns {Promise<{ uploadUrl: string, s3Key: string, expiresAt: string }>}
 * @throws  {Error} code INVALID_MIME_TYPE (status 422) — if MIME type not allowed
 * @throws  {Error} code INVALID_FILE_SIZE (status 422) — if fileSizeBytes is not a positive number
 * @throws  {Error} code FILE_TOO_LARGE    (status 422) — if file exceeds MAX_FILE_SIZE_MB
 */
async function generateUploadUrl({ hospitalId, patientId, mimeType, fileExt, fileSizeBytes }) {
  // ── MIME type validation ─────────────────────────────────────────────────
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw Object.assign(
      new Error(
        `File type "${mimeType}" is not permitted. ` +
        `Allowed types: application/pdf, image/jpeg, image/png.`
      ),
      { code: 'INVALID_MIME_TYPE', status: 422 }
    );
  }

  // ── File size validation ──────────────────────────────────────────────────
  if (!fileSizeBytes || typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
    throw Object.assign(
      new Error('fileSizeBytes must be a positive number.'),
      { code: 'INVALID_FILE_SIZE', status: 422 }
    );
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw Object.assign(
      new Error(
        `File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB exceeds the ` +
        `maximum allowed ${env.s3.maxFileSizeMb || 20} MB.`
      ),
      { code: 'FILE_TOO_LARGE', status: 422 }
    );
  }

  // ── Build S3 key (locked pattern) ────────────────────────────────────────
  const resolvedExt = fileExt || MIME_TO_EXT[mimeType] || 'bin';
  const s3Key       = buildPatientDocS3Key(hospitalId, patientId, resolvedExt);

  // ── Generate pre-signed PUT URL ───────────────────────────────────────────
  const command = new PutObjectCommand({
    Bucket:        env.s3.bucket,
    Key:           s3Key,
    ContentType:   mimeType,
    ContentLength: fileSizeBytes,
    // Server-side encryption (SSE-S3 / SSE-KMS) is enforced at bucket policy level.
    // It is NOT set here to prevent pre-signed URL signature mismatch.
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
  });

  const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000).toISOString();

  logger.info({
    msg:           'Pre-signed upload URL generated',
    hospitalId,
    patientId,
    s3Key,
    mimeType,
    fileSizeBytes,
    expiresAt,
  });

  return { uploadUrl, s3Key, expiresAt };
}

/**
 * Generates a pre-signed S3 GET URL for client-side file access.
 *
 * Applies to ALL locked S3 storage columns:
 *   - patient_documents.s3_key     (patient documents)
 *   - prescriptions.pdf_url        (prescription PDFs — value is an S3 key)
 *   - hospitals.logo_url           (hospital logo — value is an S3 key)
 *   - doctors.signature_url        (doctor signature — value is an S3 key)
 *
 * The file NEVER passes through the backend — the client fetches directly from S3.
 * URLs are NEVER stored in the database. Client must re-request on expiry.
 *
 * Access logging (Phase 2 Section 14.2 — required):
 *   Every call logs to activity_logs: action = DOCUMENT_ACCESSED.
 *   activity_logs is APPEND-ONLY. The log insert failure does NOT prevent URL delivery.
 *
 * @param {string}      s3Key       - The raw S3 object key (from the relevant DB column)
 * @param {string}      hospitalId  - UUID — required for activity_log hospital scoping
 * @param {string}      documentId  - UUID of the source entity (patient_documents.id, prescriptions.id, etc.)
 * @param {string|null} [userId]    - UUID of the requesting user (null for system/cron access)
 * @param {string}      [module]    - Source module for activity log (default: 'documents')
 * @param {string}      [entityType]- Entity type label for activity log (default: 'PatientDocument')
 *
 * @returns {Promise<{ downloadUrl: string, expiresAt: string }>}
 * @throws  {Error} code MISSING_S3_KEY      (status 400)
 * @throws  {Error} code MISSING_HOSPITAL_ID (status 400)
 * @throws  {Error} code MISSING_DOCUMENT_ID (status 400)
 */
async function generateDownloadUrl(
  s3Key,
  hospitalId,
  documentId,
  userId     = null,
  module     = 'documents',
  entityType = 'PatientDocument'
) {
  if (!s3Key)      throw Object.assign(new Error('s3Key is required.'),      { code: 'MISSING_S3_KEY',      status: 400 });
  if (!hospitalId) throw Object.assign(new Error('hospitalId is required.'), { code: 'MISSING_HOSPITAL_ID', status: 400 });
  if (!documentId) throw Object.assign(new Error('documentId is required.'), { code: 'MISSING_DOCUMENT_ID', status: 400 });

  // ── Generate pre-signed GET URL ───────────────────────────────────────────
  const command = new GetObjectCommand({
    Bucket: env.s3.bucket,
    Key:    s3Key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
  });

  const expiresAt = new Date(Date.now() + DOWNLOAD_URL_EXPIRY_SECONDS * 1000).toISOString();

  // ── Log access to activity_logs (Phase 2 Section 14.2 — required) ────────
  // activity_logs is APPEND-ONLY — never update or delete.
  // Failure here must NOT prevent the URL being returned to the caller.
  try {
    await db('activity_logs').insert({
      hospital_id: hospitalId,
      user_id:     userId || null,
      action:      'DOCUMENT_ACCESSED',
      module,
      entity_type: entityType,
      entity_id:   documentId,
      meta:        { s3Key, accessedAt: new Date().toISOString() },
    });
  } catch (logErr) {
    logger.error({
      msg:        'Failed to write DOCUMENT_ACCESSED to activity_logs — URL still returned',
      documentId,
      hospitalId,
      error:      logErr.message,
    });
  }

  logger.info({
    msg:        'Pre-signed download URL generated',
    hospitalId,
    documentId,
    s3Key,
    userId,
    expiresAt,
  });

  return { downloadUrl, expiresAt };
}

/**
 * Validates that a client-uploaded S3 object exists by issuing a HEAD request.
 *
 * Called after the client confirms upload completion (step 4 of upload flow).
 * Returns object metadata needed by the document module to populate:
 *   patient_documents.file_size_bytes, patient_documents.mime_type, patient_documents.s3_key
 *
 * The document module stores the s3_key; this helper never writes to the DB.
 *
 * @param {string} s3Key - S3 object key returned by generateUploadUrl
 *
 * @returns {Promise<{
 *   exists:        boolean,
 *   contentType:   string|null,
 *   contentLength: number|null,
 *   lastModified:  Date|null,
 *   eTag:          string|null,
 * }>}
 * @throws  {Error} code MISSING_S3_KEY     (status 400) — if s3Key is empty
 * @throws  {Error} code S3_VALIDATION_ERROR (status 502) — for unexpected S3 errors
 */
async function validateUpload(s3Key) {
  if (!s3Key) {
    throw Object.assign(new Error('s3Key is required for upload validation.'), {
      code:   'MISSING_S3_KEY',
      status: 400,
    });
  }

  try {
    const command  = new HeadObjectCommand({
      Bucket: env.s3.bucket,
      Key:    s3Key,
    });
    const response = await s3Client.send(command);

    return {
      exists:        true,
      contentType:   response.ContentType   || null,
      contentLength: response.ContentLength || null,
      lastModified:  response.LastModified  || null,
      eTag:          response.ETag ? response.ETag.replace(/"/g, '') : null,
    };
  } catch (err) {
    // AWS SDK v3: NotFound or 404 from $metadata indicates object does not exist
    const isNotFound =
      err.name === 'NotFound' ||
      err.$metadata?.httpStatusCode === 404 ||
      err.Code === 'NoSuchKey';

    if (isNotFound) {
      logger.warn({ msg: 'S3 validateUpload: object not found', s3Key });
      return {
        exists:        false,
        contentType:   null,
        contentLength: null,
        lastModified:  null,
        eTag:          null,
      };
    }

    logger.error({ msg: 'S3 validateUpload: HEAD request failed', s3Key, error: err.message });

    throw Object.assign(
      new Error(`S3 upload validation failed: ${err.message}`),
      { code: 'S3_VALIDATION_ERROR', status: 502 }
    );
  }
}

/**
 * Returns a structured soft-delete instruction for a given S3 object.
 *
 * MVP RULE (Phase 2 Section 7 + Phase 3 locked):
 *   Physical deletion from S3 is PROHIBITED in MVP.
 *   The document module calls this function and acts on the returned instruction:
 *     → Set patient_documents.is_deleted = true
 *     → Set patient_documents.deleted_at = NOW()
 *     → Set patient_documents.deleted_by = userId
 *     → Append record to activity_logs
 *
 * This helper makes NO S3 API call. It is a pure instruction factory.
 * It exists to make the soft-delete contract explicit and prevent the document
 * module from accidentally calling a physical delete.
 *
 * @param {string} s3Key - The s3_key of the object to soft-delete
 *
 * @returns {{
 *   action:                 'soft_delete',
 *   s3Key:                  string,
 *   shouldPhysicallyDelete: false,
 *   instruction:            string,
 * }}
 * @throws {Error} code MISSING_S3_KEY (status 400)
 */
function deleteFile(s3Key) {
  if (!s3Key) {
    throw Object.assign(new Error('s3Key is required.'), {
      code:   'MISSING_S3_KEY',
      status: 400,
    });
  }

  logger.info({
    msg:   'deleteFile called — returning soft-delete instruction (no S3 API call in MVP)',
    s3Key,
  });

  return {
    action:                 'soft_delete',
    s3Key,
    shouldPhysicallyDelete: false,
    instruction: (
      'Document module must: ' +
      '(1) SET patient_documents.is_deleted = true, deleted_at = NOW(), deleted_by = <userId>. ' +
      '(2) Append DOCUMENT_DELETED entry to activity_logs. ' +
      '(3) Do NOT issue S3 DeleteObjectCommand in MVP. ' +
      'Physical deletion is deferred to a post-MVP lifecycle policy.'
    ),
  };
}

/**
 * Uploads a Buffer directly to S3.
 * Used for server-generated files (prescription PDFs, invoice PDFs, receipts, consultation PDFs).
 * Does NOT generate a pre-signed URL — the object is PUT using server credentials.
 *
 * S3 key patterns for server-generated PDFs (by convention):
 *   prescriptions/{hospitalId}/{patientId}/{prescriptionId}/prescription.pdf
 *   billing/{hospitalId}/{patientId}/{invoiceId}/invoice.pdf
 *   billing/{hospitalId}/{patientId}/{invoiceId}/receipt.pdf
 *   consultations/{hospitalId}/{patientId}/{consultationId}/consultation_summary.pdf
 *
 * @param {string} s3Key       - Full S3 object key
 * @param {Buffer} buffer      - File content as a Node.js Buffer
 * @param {string} contentType - MIME type (e.g. 'application/pdf')
 * @returns {Promise<void>}
 * @throws {Error} code S3_UPLOAD_ERROR (status 502) on failure
 */
async function uploadBufferToS3(s3Key, buffer, contentType) {
  if (!s3Key)       throw Object.assign(new Error('s3Key is required for buffer upload.'),      { code: 'MISSING_S3_KEY',        status: 400 });
  if (!buffer)      throw Object.assign(new Error('buffer is required for buffer upload.'),     { code: 'MISSING_BUFFER',        status: 400 });
  if (!contentType) throw Object.assign(new Error('contentType is required for buffer upload.'),{ code: 'MISSING_CONTENT_TYPE', status: 400 });

  try {
    const command = new PutObjectCommand({
      Bucket:      env.s3.bucket,
      Key:         s3Key,
      Body:        buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    logger.info({
      msg:       'Buffer uploaded to S3 successfully',
      s3Key,
      contentType,
      sizeBytes: buffer.length,
    });
  } catch (err) {
    logger.error({ msg: 'S3 buffer upload failed', s3Key, error: err.message });
    throw Object.assign(
      new Error(`S3 upload failed for key "${s3Key}": ${err.message}`),
      { code: 'S3_UPLOAD_ERROR', status: 502 }
    );
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  uploadBufferToS3,
  validateUpload,
  deleteFile,
};
