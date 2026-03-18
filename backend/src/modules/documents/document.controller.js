'use strict';

const documentService = require('./document.service');
const {
  getUploadUrlSchema,
  createDocumentSchema,
  listPatientDocumentsSchema,
} = require('../../validators/document.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(
      errorResponse(
        'Validation failed.',
        error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        }))
      )
    );
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

function actorFromReq(req) {
  return { userId: req.user.userId, hospitalId: req.user.hospitalId, role: req.user.role };
}

// ─── POST /api/v1/documents/upload-url ───────────────────────────────────────

/**
 * Request a pre-signed S3 PUT URL before the client uploads a file.
 * Returns the upload URL and the s3_key to use in POST /documents.
 */
async function getUploadUrl(req, res, next) {
  try {
    const { valid, value } = validate(getUploadUrlSchema, req.body, res);
    if (!valid) return;

    const result = await documentService.getUploadUrl(value, actorFromReq(req));
    return res.status(200).json(successResponse('Upload URL generated. Upload the file directly to this URL, then call POST /documents with the s3_key.', result));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/documents ───────────────────────────────────────────────────

/**
 * Create a patient_documents metadata record after the client has
 * successfully uploaded the file to S3.
 */
async function createDocument(req, res, next) {
  try {
    const { valid, value } = validate(createDocumentSchema, req.body, res);
    if (!valid) return;

    const document = await documentService.createDocumentRecord(value, actorFromReq(req));
    return res.status(201).json(successResponse('Document record created.', document));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/documents ────────────────────────────────

/**
 * List all documents for a patient with optional type/status filters.
 */
async function listPatientDocuments(req, res, next) {
  try {
    const { valid, value } = validate(listPatientDocumentsSchema, req.query, res);
    if (!valid) return;

    const result = await documentService.listPatientDocuments(
      req.params.patientId,
      value,
      actorFromReq(req)
    );

    return res.status(200).json(
      successResponse('Patient documents retrieved.', result.rows, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/documents/:id/url ───────────────────────────────────────────

/**
 * Get document metadata + a pre-signed S3 GET URL.
 * Distinct from Batch 4's GET /documents/:id (which also returns metadata
 * but was scoped to the document review workflow). This endpoint serves
 * the pure download/access pattern.
 *
 * Route ordering note: /:id/url has an extra path segment and will not
 * conflict with /:id in the Batch 4 router.
 */
async function getDocumentUrl(req, res, next) {
  try {
    const result = await documentService.getDocumentAccessUrl(
      req.params.id,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Document URL generated.', result));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUploadUrl,
  createDocument,
  listPatientDocuments,
  getDocumentUrl,
};
