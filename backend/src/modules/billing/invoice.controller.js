'use strict';

const invoiceService = require('./invoice.service');
const {
  createInvoiceSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
  addItemSchema,
  finalizeInvoiceSchema,
  recordPaymentSchema,
  refundInvoiceSchema,
  voidInvoiceSchema,
} = require('../../validators/invoice.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(errorResponse('Validation failed.', error.details.map((d) => ({
      code: 'VALIDATION_ERROR', field: d.context?.label || d.path?.join('.'), detail: d.message,
    }))));
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

function actorFromReq(req) {
  return { userId: req.user.userId, hospitalId: req.user.hospitalId, role: req.user.role };
}

async function createInvoice(req, res, next) {
  try {
    const { valid, value } = validate(createInvoiceSchema, req.body, res); if (!valid) return;
    const invoice = await invoiceService.createInvoice(value, actorFromReq(req));
    return res.status(201).json(successResponse('Invoice created.', invoice));
  } catch (err) { next(err); }
}

async function listInvoices(req, res, next) {
  try {
    const { valid, value } = validate(listInvoicesSchema, req.query, res); if (!valid) return;
    const result = await invoiceService.listInvoices(value, actorFromReq(req));
    return res.status(200).json(successResponse('Invoices retrieved.', result.rows, { total: result.total, page: result.page, limit: result.limit, total_pages: result.total_pages }));
  } catch (err) { next(err); }
}

async function getInvoice(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id, actorFromReq(req));
    return res.status(200).json(successResponse('Invoice retrieved.', invoice));
  } catch (err) { next(err); }
}

async function updateInvoice(req, res, next) {
  try {
    const { valid, value } = validate(updateInvoiceSchema, req.body, res); if (!valid) return;
    const updated = await invoiceService.updateInvoice(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Invoice updated.', updated));
  } catch (err) { next(err); }
}

async function addItem(req, res, next) {
  try {
    const { valid, value } = validate(addItemSchema, req.body, res); if (!valid) return;
    const item = await invoiceService.addItem(req.params.id, value, actorFromReq(req));
    return res.status(201).json(successResponse('Item added to invoice.', item));
  } catch (err) { next(err); }
}

async function removeItem(req, res, next) {
  try {
    const result = await invoiceService.removeItem(req.params.id, req.params.itemId, actorFromReq(req));
    return res.status(200).json(successResponse('Item removed from draft invoice.', result));
  } catch (err) { next(err); }
}

async function finalizeInvoice(req, res, next) {
  try {
    const { error } = finalizeInvoiceSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json(errorResponse('Unexpected request body.', []));
    const invoice = await invoiceService.finalizeInvoice(req.params.id, actorFromReq(req));
    return res.status(200).json(successResponse('Invoice finalised. Invoice number assigned.', invoice));
  } catch (err) { next(err); }
}

async function recordPayment(req, res, next) {
  try {
    const { valid, value } = validate(recordPaymentSchema, req.body, res); if (!valid) return;
    const invoice = await invoiceService.recordPayment(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Payment recorded.', invoice));
  } catch (err) { next(err); }
}

async function refundInvoice(req, res, next) {
  try {
    const { valid, value } = validate(refundInvoiceSchema, req.body, res); if (!valid) return;
    const invoice = await invoiceService.refundInvoice(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Refund processed.', invoice));
  } catch (err) { next(err); }
}

async function voidInvoice(req, res, next) {
  try {
    const { valid, value } = validate(voidInvoiceSchema, req.body, res); if (!valid) return;
    const invoice = await invoiceService.voidInvoice(req.params.id, value, actorFromReq(req));
    return res.status(200).json(successResponse('Invoice voided.', invoice));
  } catch (err) { next(err); }
}

async function getInvoicePdf(req, res, next) {
  try {
    const result = await invoiceService.getInvoicePdf(req.params.id, actorFromReq(req));
    return res.status(200).json(successResponse('Invoice PDF URL generated.', result));
  } catch (err) { next(err); }
}

module.exports = { createInvoice, listInvoices, getInvoice, updateInvoice, addItem, removeItem, finalizeInvoice, recordPayment, refundInvoice, voidInvoice, getInvoicePdf };
