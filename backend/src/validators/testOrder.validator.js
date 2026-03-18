'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB migrations ────────────────────────────────────

const TEST_ORDER_STATUS = {
  ORDERED: 'ordered',
  PENDING: 'pending',
  RESULT_UPLOADED: 'result_uploaded',
  REVIEWED: 'reviewed',
  OVERDUE: 'overdue',
  SKIPPED: 'skipped',
};

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/test-orders
 */
const createTestOrderSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  consultation_id: Joi.string().uuid().required(),
  pregnancy_id: Joi.string().uuid().allow(null),
  test_catalog_id: Joi.string().uuid().required(),
  due_date: Joi.date().iso().required(),
  notes: Joi.string().max(2000).allow(null, ''),
});

/**
 * GET /api/v1/test-orders — list/filter
 */
const listTestOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string()
    .valid('due_date', 'created_at', 'status')
    .default('due_date'),
  sort_dir: Joi.string().valid('asc', 'desc').default('asc'),
  patient_id: Joi.string().uuid(),
  pregnancy_id: Joi.string().uuid(),
  status: Joi.string().valid(...Object.values(TEST_ORDER_STATUS)),
  ordered_by: Joi.string().uuid(),
  due_date_from: Joi.date().iso(),
  due_date_to: Joi.date().iso(),
});

/**
 * PATCH /api/v1/test-orders/:id/skip
 */
const skipTestOrderSchema = Joi.object({
  skip_reason: Joi.string().min(5).max(2000).required(),
});

/**
 * PATCH /api/v1/test-orders/:id/link-result
 */
const linkResultSchema = Joi.object({
  result_doc_id: Joi.string().uuid().required(),
});

/**
 * GET /api/v1/test-orders/overdue — query params
 */
const overdueQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  ordered_by: Joi.string().uuid(),
  branch_id: Joi.string().uuid(),
});

module.exports = {
  createTestOrderSchema,
  listTestOrdersSchema,
  skipTestOrderSchema,
  linkResultSchema,
  overdueQuerySchema,
  TEST_ORDER_STATUS,
};
