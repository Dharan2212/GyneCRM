'use strict';

const testOrderService = require('./testOrder.service');
const {
  createTestOrderSchema,
  listTestOrdersSchema,
  skipTestOrderSchema,
  linkResultSchema,
  overdueQuerySchema,
} = require('../../validators/testOrder.validator');
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

// POST /api/v1/test-orders
async function createTestOrder(req, res, next) {
  try {
    const { valid, value } = validate(createTestOrderSchema, req.body, res);
    if (!valid) return;
    const order = await testOrderService.createTestOrder(value, actorFromReq(req));
    return res.status(201).json(successResponse('Test order created.', order));
  } catch (err) { next(err); }
}

// GET /api/v1/test-orders
async function listTestOrders(req, res, next) {
  try {
    const { valid, value } = validate(listTestOrdersSchema, req.query, res);
    if (!valid) return;
    const result = await testOrderService.listTestOrders(value, actorFromReq(req));
    return res.status(200).json(successResponse('Test orders retrieved.', result.rows, {
      total: result.total, page: result.page, limit: result.limit, total_pages: result.total_pages,
    }));
  } catch (err) { next(err); }
}

// PATCH /api/v1/test-orders/:id/skip
async function skipTestOrder(req, res, next) {
  try {
    const { valid, value } = validate(skipTestOrderSchema, req.body, res);
    if (!valid) return;
    const updated = await testOrderService.skipTestOrder(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Test order skipped.', updated));
  } catch (err) { next(err); }
}

// PATCH /api/v1/test-orders/:id/link-result
async function linkResult(req, res, next) {
  try {
    const { valid, value } = validate(linkResultSchema, req.body, res);
    if (!valid) return;
    const updated = await testOrderService.linkResult(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Result document linked to test order.', updated));
  } catch (err) { next(err); }
}

// GET /api/v1/test-orders/overdue
async function listOverdue(req, res, next) {
  try {
    const { valid, value } = validate(overdueQuerySchema, req.query, res);
    if (!valid) return;
    const result = await testOrderService.listOverdue(value, actorFromReq(req));
    return res.status(200).json(successResponse('Overdue test orders retrieved.', result.rows, {
      total: result.total, page: result.page, limit: result.limit, total_pages: result.total_pages,
    }));
  } catch (err) { next(err); }
}

module.exports = { createTestOrder, listTestOrders, skipTestOrder, linkResult, listOverdue };
