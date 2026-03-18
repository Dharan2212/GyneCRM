'use strict';

const documentReviewService = require('./documentReview.service');
const {
  reviewInboxQuerySchema,
  reviewDocumentSchema,
  flagDocumentSchema,
  deleteDocumentSchema,
} = require('../../validators/documentReview.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(
      errorResponse('Validation failed.', error.details.map((d) => ({
        code: 'VALIDATION_ERROR',
        field: d.context?.label || d.path?.join('.'),
        detail: d.message,
      })))
    );
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

function actorFromReq(req) {
  return { userId: req.user.userId, hospitalId: req.user.hospitalId, role: req.user.role };
}

// GET /api/v1/documents/review-inbox
async function getReviewInbox(req, res, next) {
  try {
    const { valid, value } = validate(reviewInboxQuerySchema, req.query, res);
    if (!valid) return;
    const result = await documentReviewService.getReviewInbox(value, actorFromReq(req));
    return res.status(200).json(successResponse('Review inbox retrieved.', result.rows, {
      total: result.total, page: result.page, limit: result.limit, total_pages: result.total_pages,
    }));
  } catch (err) { next(err); }
}

// GET /api/v1/documents/:id
async function getDocument(req, res, next) {
  try {
    const doc = await documentReviewService.getDocumentById(req.params.id, actorFromReq(req));
    return res.status(200).json(successResponse('Document retrieved.', doc));
  } catch (err) { next(err); }
}

// POST /api/v1/documents/:id/review
async function reviewDocument(req, res, next) {
  try {
    const { valid, value } = validate(reviewDocumentSchema, req.body, res);
    if (!valid) return;
    const updated = await documentReviewService.reviewDocument(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Document reviewed.', updated));
  } catch (err) { next(err); }
}

// POST /api/v1/documents/:id/flag
async function flagDocument(req, res, next) {
  try {
    const { valid, value } = validate(flagDocumentSchema, req.body, res);
    if (!valid) return;
    const updated = await documentReviewService.flagDocument(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Document flagged. Admin alert generated.', updated));
  } catch (err) { next(err); }
}

// DELETE /api/v1/documents/:id
async function softDeleteDocument(req, res, next) {
  try {
    const { valid, value } = validate(deleteDocumentSchema, req.body, res);
    if (!valid) return;
    const result = await documentReviewService.softDeleteDocument(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Document soft deleted.', result));
  } catch (err) { next(err); }
}

module.exports = { getReviewInbox, getDocument, reviewDocument, flagDocument, softDeleteDocument };
