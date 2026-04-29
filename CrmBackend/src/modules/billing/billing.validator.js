const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const STATUS_ENUM = ['draft', 'issued', 'partially_paid', 'paid', 'void'];
const CURRENCY_ENUM = ['INR', 'USD', 'EUR', 'GBP', 'OTHER'];
const ITEM_TYPE_ENUM = ['consultation', 'procedure', 'medicine', 'lab_test', 'document', 'service', 'other'];
const SOURCE_TYPE_ENUM = ['consultation', 'prescription', 'test_order', 'patient_document', 'appointment', 'service', 'other'];
const ITEM_STATUS_ENUM = ['active', 'cancelled', 'waived'];
const PAYMENT_METHOD_ENUM = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'];
const PAYMENT_STATUS_ENUM = ['recorded', 'confirmed', 'failed', 'reversed'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];

const invoiceItemSchema = Joi.object({
  item_no: Joi.number().integer().min(1).optional(),
  item_type: Joi.string().trim().valid(...ITEM_TYPE_ENUM).optional(),
  label: Joi.string().trim().min(1).max(200).required(),
  description: nullableString.max(2000).optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_ENUM).allow(null).optional(),
  source_id: objectIdSchema.allow(null).optional(),
  quantity: Joi.number().min(0).optional(),
  unit_price: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  tax_amount: Joi.number().min(0).optional(),
  line_total: Joi.number().min(0).optional(),
  notes: nullableString.max(1000).optional(),
  status: Joi.string().trim().valid(...ITEM_STATUS_ENUM).optional(),
});

const createInvoiceSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.optional(),
  appointment_id: objectIdSchema.optional(),
  consultation_id: objectIdSchema.optional(),
  prescription_id: objectIdSchema.optional(),
  test_order_id: objectIdSchema.optional(),
  patient_document_id: objectIdSchema.optional(),
  invoice_date: Joi.date().iso().optional(),
  due_date: Joi.date().iso().allow(null).optional(),
  currency: Joi.string().trim().valid(...CURRENCY_ENUM).optional(),
  notes: nullableString.max(3000).optional(),
  internal_notes: nullableString.max(3000).optional(),
  items: Joi.array().items(invoiceItemSchema).min(0).default([]),
});

const listInvoicesSchema = Joi.object({
  patient_id: objectIdSchema.optional(),
  doctor_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...STATUS_ENUM).optional(),
  invoice_date_from: Joi.date().iso().optional(),
  invoice_date_to: Joi.date().iso().optional(),
  due_date_from: Joi.date().iso().optional(),
  due_date_to: Joi.date().iso().optional(),
  search: nullableString.max(120).optional(),
  ...paginationSchema,
});

const invoiceIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updateInvoiceSchema = Joi.object({
  invoice_date: Joi.date().iso().optional(),
  due_date: Joi.date().iso().allow(null).optional(),
  currency: Joi.string().trim().valid(...CURRENCY_ENUM).optional(),
  notes: nullableString.max(3000).optional(),
  internal_notes: nullableString.max(3000).optional(),
  items: Joi.array().items(invoiceItemSchema).min(0).optional(),
}).min(1);

const addItemSchema = Joi.object({
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
});

const finalizeInvoiceSchema = emptyObjectSchema;

const recordPaymentSchema = Joi.object({
  payment_date: Joi.date().iso().optional(),
  amount: Joi.number().positive().required(),
  method: Joi.string().trim().valid(...PAYMENT_METHOD_ENUM).required(),
  reference_number: nullableString.max(200).optional(),
  status: Joi.string().trim().valid(...PAYMENT_STATUS_ENUM).optional(),
  notes: nullableString.max(2000).optional(),
});

const invoicePdfSchema = Joi.object({
  id: objectIdSchema.required(),
});

const sendInvoiceSchema = Joi.object({
  send_channels: Joi.array().items(Joi.string().trim().valid(...SEND_CHANNEL_ENUM)).min(1).required(),
  send_notes: nullableString.max(2000).optional(),
});

module.exports = {
  createInvoiceSchema,
  listInvoicesSchema,
  invoiceIdParamSchema,
  updateInvoiceSchema,
  addItemSchema,
  finalizeInvoiceSchema,
  recordPaymentSchema,
  invoicePdfSchema,
  sendInvoiceSchema,
};
