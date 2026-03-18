'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB/architecture ──────────────────────────────────

const REVIEW_STATUS = {
  PENDING_REVIEW: 'pending_review',
  REVIEWED: 'reviewed',
  NO_REVIEW_REQUIRED: 'no_review_required',
  FLAGGED: 'flagged',
};

const FLAG_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/documents/review-inbox — query params
 */
const reviewInboxQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('uploaded_at', 'patient_id').default('uploaded_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  patient_id: Joi.string().uuid(),
  document_type: Joi.string().max(100),
});

/**
 * POST /api/v1/documents/:id/review
 * Architecture Part 20: review_note, extracted_key_values, linked_test_order_id,
 * action_required, action_description.
 */
const reviewDocumentSchema = Joi.object({
  review_summary: Joi.string().max(5000).allow(null, ''),
  extracted_key_values: Joi.object().pattern(
    Joi.string().max(200),
    Joi.object({
      value: Joi.number().required(),
      unit: Joi.string().max(50).allow(null, ''),
    }).required()
  ).allow(null),
  linked_test_order_id: Joi.string().uuid().allow(null),
  linked_consultation_id: Joi.string().uuid().allow(null),
  action_required: Joi.boolean().default(false),
  action_description: Joi.string().max(3000).allow(null, '').when('action_required', {
    is: true,
    then: Joi.string().min(5).max(3000).required(),
    otherwise: Joi.string().max(3000).allow(null, ''),
  }),
});

/**
 * POST /api/v1/documents/:id/flag
 */
const flagDocumentSchema = Joi.object({
  flag_level: Joi.string()
    .valid(...Object.values(FLAG_LEVEL))
    .required(),
  flag_reason: Joi.string().min(5).max(2000).required(),
  override_note: Joi.string().max(2000).allow(null, ''),
});

/**
 * DELETE /api/v1/documents/:id
 */
const deleteDocumentSchema = Joi.object({
  delete_reason: Joi.string().min(5).max(2000).required(),
});

module.exports = {
  reviewInboxQuerySchema,
  reviewDocumentSchema,
  flagDocumentSchema,
  deleteDocumentSchema,
  REVIEW_STATUS,
  FLAG_LEVEL,
};
