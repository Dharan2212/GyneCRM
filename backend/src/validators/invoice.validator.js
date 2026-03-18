'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB migration 030 ─────────────────────────────────

const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  REFUNDED: 'refunded',
  VOID: 'void',
};

const PAYMENT_MODES = ['cash', 'card', 'upi', 'insurance', 'online'];

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/invoices
 */
const createInvoiceSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  consultation_id: Joi.string().uuid().allow(null),
  branch_id: Joi.string().uuid().allow(null),
  notes: Joi.string().max(3000).allow(null, ''),
});

/**
 * GET /api/v1/invoices — list/filter
 */
const listInvoicesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('created_at', 'invoice_number', 'total_amount', 'status').default('created_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  patient_id: Joi.string().uuid(),
  branch_id: Joi.string().uuid(),
  status: Joi.string().valid(...Object.values(INVOICE_STATUS)),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  invoice_number: Joi.string().max(50),
});

/**
 * PUT /api/v1/invoices/:id — update draft invoice header
 */
const updateInvoiceSchema = Joi.object({
  consultation_id: Joi.string().uuid().allow(null),
  notes: Joi.string().max(3000).allow(null, ''),
  branch_id: Joi.string().uuid().allow(null),
})
  .min(1)
  .options({ stripUnknown: true });

/**
 * POST /api/v1/invoices/:id/items
 * Both catalog-linked and manual items supported.
 */
const addItemSchema = Joi.object({
  service_catalog_id: Joi.string().uuid().allow(null),
  item_name: Joi.string().max(300).required(),
  quantity: Joi.number().integer().min(1).max(999).default(1),
  unit_price: Joi.number().min(0).precision(2).required(),
  discount_amount: Joi.number().min(0).precision(2).default(0),
  sort_order: Joi.number().integer().min(0).default(0),
  // tax_amount is computed server-side from hospital_settings or service_catalog.tax_rate
});

/**
 * POST /api/v1/invoices/:id/finalize
 * No body required — pure state transition. Validate empty body.
 */
const finalizeInvoiceSchema = Joi.object({}).options({ allowUnknown: false });

/**
 * POST /api/v1/invoices/:id/payments
 * Payment reference validation varies by mode (enforced in service).
 */
const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  payment_mode: Joi.string().valid(...PAYMENT_MODES).required(),
  payment_date: Joi.date().iso().default(() => new Date()),
  reference_number: Joi.string().max(500).allow(null, ''),
  notes: Joi.string().max(1000).allow(null, ''),
});

/**
 * POST /api/v1/invoices/:id/refund
 */
const refundInvoiceSchema = Joi.object({
  refund_amount: Joi.number().min(0.01).precision(2).required(),
  refund_reason: Joi.string().min(5).max(2000).required(),
  refund_mode: Joi.string().valid(...PAYMENT_MODES).required(),
  note: Joi.string().max(1000).allow(null, ''),
});

/**
 * POST /api/v1/invoices/:id/void
 */
const voidInvoiceSchema = Joi.object({
  void_reason: Joi.string().min(5).max(2000).required(),
});

module.exports = {
  createInvoiceSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
  addItemSchema,
  finalizeInvoiceSchema,
  recordPaymentSchema,
  refundInvoiceSchema,
  voidInvoiceSchema,
  INVOICE_STATUS,
  PAYMENT_MODES,
};
