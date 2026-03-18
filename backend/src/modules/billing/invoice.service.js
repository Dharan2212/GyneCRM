'use strict';

const { db } = require('../../db/connection');
const invoiceRepo = require('./invoice.repository');
const { generateInvoicePdf } = require('../../utils/pdfGenerator.invoice');
const { generateReceiptPdf } = require('../../utils/pdfGenerator.receipt');
const { uploadBufferToS3, generateDownloadUrl } = require('../../utils/s3-helper');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const logger = require('../../utils/logger');
const {
  INVOICE_STATUS,
  PAYMENT_MODES,
} = require('../../validators/invoice.validator');

// ─── Calculation helpers ──────────────────────────────────────────────────────

/**
 * Compute invoice totals from an array of item rows.
 * Architecture Part 13:
 *   line_total = (unit_price * quantity) - discount_amount + tax_amount
 *   invoice subtotal = sum of (unit_price * quantity)
 *   invoice discount_amount = sum of item discount_amounts
 *   invoice tax_amount = applied to (subtotal - discount) using hospital tax_rate
 *   invoice total_amount = subtotal - discount_amount + tax_amount
 *
 * @param {Array} items
 * @param {number} hospitalTaxRate - from hospital_settings (percentage, e.g. 18 for 18%)
 * @returns {{ subtotal, discount_amount, tax_amount, total_amount }}
 */
function computeInvoiceTotals(items, hospitalTaxRate = 0) {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let totalItemTax = 0;

  for (const item of items) {
    const lineBase = parseFloat(item.unit_price) * parseInt(item.quantity, 10);
    subtotal += lineBase;
    totalItemDiscount += parseFloat(item.discount_amount || 0);
    totalItemTax += parseFloat(item.tax_amount || 0); // item-level tax already computed when item was added
  }

  // Invoice-level tax applied to (subtotal - totalItemDiscount) using hospital rate
  // if individual item taxes are not already covering it, otherwise use item totals
  // Architecture: "Tax applied to (subtotal - discount). Tax rate from hospital_settings."
  // We apply the hospital tax rate on top of the net after discount.
  const taxableBase = subtotal - totalItemDiscount;
  const hospitalTax = parseFloat((taxableBase * (hospitalTaxRate / 100)).toFixed(2));

  // Use the larger of item-level taxes or hospital-level tax (no double-dipping)
  const taxAmount = Math.max(totalItemTax, hospitalTax);
  const totalAmount = subtotal - totalItemDiscount + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_amount: parseFloat(totalItemDiscount.toFixed(2)),
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    total_amount: parseFloat(totalAmount.toFixed(2)),
  };
}

/**
 * Compute line_total for a single item.
 */
function computeLineTotal(unitPrice, quantity, discountAmount, taxAmount) {
  return parseFloat(
    (parseFloat(unitPrice) * parseInt(quantity, 10) - parseFloat(discountAmount || 0) + parseFloat(taxAmount || 0)).toFixed(2)
  );
}

/**
 * Validate payment reference requirements based on mode.
 * Architecture: non-cash payments require reference numbers.
 */
function validatePaymentReference(paymentMode, referenceNumber) {
  const REQUIRES_REFERENCE = ['card', 'upi', 'online', 'insurance'];
  if (REQUIRES_REFERENCE.includes(paymentMode) && !referenceNumber?.trim()) {
    const err = new Error(
      `Payment mode '${paymentMode}' requires a reference_number (transaction ID, last-4 digits, policy number, etc.)`
    );
    err.statusCode = 422;
    err.code = 'PAYMENT_REFERENCE_REQUIRED';
    throw err;
  }
}

// ─── Invoice access guard ─────────────────────────────────────────────────────

async function assertInvoiceExists(id, hospitalId) {
  const invoice = await invoiceRepo.findById(id, hospitalId);
  if (!invoice) {
    const err = new Error('Invoice not found.');
    err.statusCode = 404;
    err.code = 'INVOICE_NOT_FOUND';
    throw err;
  }
  return invoice;
}

function assertDraftStatus(invoice) {
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    const err = new Error(`Invoice is '${invoice.status}'. Only draft invoices can be modified.`);
    err.statusCode = 422;
    err.code = 'INVOICE_NOT_DRAFT';
    throw err;
  }
}

// ─── Service methods ──────────────────────────────────────────────────────────

async function createInvoice(data, actor) {
  const { patient_id, consultation_id, branch_id, notes } = data;
  const { userId, hospitalId } = actor;

  const patient = await invoiceRepo.findPatientById(patient_id, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  if (consultation_id) {
    const consultation = await invoiceRepo.findConsultationById(consultation_id, hospitalId);
    if (!consultation) {
      const err = new Error('Consultation not found.'); err.statusCode = 404; err.code = 'CONSULTATION_NOT_FOUND'; throw err;
    }
    if (consultation.patient_id !== patient_id) {
      const err = new Error('Consultation does not belong to the specified patient.'); err.statusCode = 422; err.code = 'PATIENT_CONSULTATION_MISMATCH'; throw err;
    }
  }

  if (branch_id) {
    const branch = await invoiceRepo.findBranchById(branch_id, hospitalId);
    if (!branch) {
      const err = new Error('Branch not found or inactive.'); err.statusCode = 404; err.code = 'BRANCH_NOT_FOUND'; throw err;
    }
  }

  const invoice = await invoiceRepo.create({
    hospital_id: hospitalId,
    branch_id: branch_id || null,
    patient_id,
    consultation_id: consultation_id || null,
    invoice_number: null, // assigned on finalize
    status: INVOICE_STATUS.DRAFT,
    subtotal: 0,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 0,
    paid_amount: 0,
    notes: notes || null,
    created_by: userId,
    is_deleted: false,
  });

  await auditLog({ hospitalId, userId, action: 'INVOICE_CREATED', entityType: 'invoice', entityId: invoice.id, meta: { patient_id, consultation_id } });
  return invoiceRepo.findByIdWithDetails(invoice.id, hospitalId);
}

async function listInvoices(queryParams, actor) {
  const { hospitalId } = actor;
  const { page, limit, sort_by: sortBy, sort_dir: sortDir, patient_id: patientId, branch_id: branchId, status, date_from: dateFrom, date_to: dateTo, invoice_number: invoiceNumber } = queryParams;
  return invoiceRepo.findAll(hospitalId, { page, limit, sortBy, sortDir, patientId, branchId, status, dateFrom, dateTo, invoiceNumber });
}

async function getInvoiceById(id, actor) {
  const { hospitalId } = actor;
  const invoice = await invoiceRepo.findByIdWithDetails(id, hospitalId);
  if (!invoice) {
    const err = new Error('Invoice not found.'); err.statusCode = 404; err.code = 'INVOICE_NOT_FOUND'; throw err;
  }
  return invoice;
}

async function updateInvoice(id, data, actor) {
  const { userId, hospitalId } = actor;
  const invoice = await assertInvoiceExists(id, hospitalId);
  assertDraftStatus(invoice);

  const updated = await invoiceRepo.update(id, hospitalId, data);
  await auditLog({ hospitalId, userId, action: 'INVOICE_UPDATED', entityType: 'invoice', entityId: id, meta: { updated_fields: Object.keys(data) } });
  return invoiceRepo.findByIdWithDetails(id, hospitalId);
}

async function addItem(invoiceId, data, actor) {
  const { userId, hospitalId } = actor;
  const invoice = await assertInvoiceExists(invoiceId, hospitalId);
  assertDraftStatus(invoice);

  const { service_catalog_id, item_name, quantity, unit_price, discount_amount, sort_order } = data;

  let taxAmount = 0;
  let resolvedName = item_name;

  // If service_catalog_id provided, enrich from catalog
  if (service_catalog_id) {
    const svc = await invoiceRepo.findServiceCatalogById(service_catalog_id, hospitalId);
    if (!svc) {
      const err = new Error('Service catalog item not found or inactive.'); err.statusCode = 404; err.code = 'SERVICE_NOT_FOUND'; throw err;
    }
    // Use catalog name if item_name not explicitly overridden
    resolvedName = item_name || svc.service_name;
    // Compute item-level tax from service_catalog.tax_rate if present
    if (svc.tax_rate > 0) {
      const baseAfterDiscount = parseFloat(unit_price) * parseInt(quantity, 10) - parseFloat(discount_amount || 0);
      taxAmount = parseFloat((baseAfterDiscount * (svc.tax_rate / 100)).toFixed(2));
    }
  }

  const lineTotal = computeLineTotal(unit_price, quantity, discount_amount, taxAmount);

  const item = await invoiceRepo.createItem({
    invoice_id: invoiceId,
    service_catalog_id: service_catalog_id || null,
    item_name: resolvedName,
    quantity: quantity || 1,
    unit_price,
    discount_amount: discount_amount || 0,
    tax_amount: taxAmount,
    line_total: lineTotal,
    sort_order: sort_order || 0,
  });

  await auditLog({ hospitalId, userId, action: 'INVOICE_UPDATED', entityType: 'invoice', entityId: invoiceId, meta: { action: 'item_added', item_id: item.id } });
  return item;
}

async function removeItem(invoiceId, itemId, actor) {
  const { userId, hospitalId } = actor;
  const invoice = await assertInvoiceExists(invoiceId, hospitalId);
  assertDraftStatus(invoice);

  const item = await invoiceRepo.findItemById(itemId, invoiceId);
  if (!item) {
    const err = new Error('Invoice item not found.'); err.statusCode = 404; err.code = 'INVOICE_ITEM_NOT_FOUND'; throw err;
  }

  await invoiceRepo.deleteItem(itemId, invoiceId);
  await auditLog({ hospitalId, userId, action: 'INVOICE_UPDATED', entityType: 'invoice', entityId: invoiceId, meta: { action: 'item_removed', item_id: itemId } });
  return { deleted: true, item_id: itemId };
}

/**
 * Finalize an invoice:
 * 1. Reject if no items
 * 2. Recompute totals from items
 * 3. Assign invoice number (atomic, within transaction)
 * 4. Set status → pending
 */
async function finalizeInvoice(id, actor) {
  const { userId, hospitalId } = actor;
  const invoice = await assertInvoiceExists(id, hospitalId);
  assertDraftStatus(invoice);

  const items = await invoiceRepo.findItemsByInvoiceId(id);
  if (items.length === 0) {
    const err = new Error('Cannot finalise an invoice with no line items. Add at least one item before finalising.');
    err.statusCode = 422; err.code = 'INVOICE_NO_ITEMS'; throw err;
  }

  // Fetch hospital tax rate from settings
  const taxRateSetting = await invoiceRepo.getHospitalSetting(hospitalId, 'tax_rate');
  const hospitalTaxRate = parseFloat(taxRateSetting || '0');

  const totals = computeInvoiceTotals(items, hospitalTaxRate);

  const updated = await db.transaction(async (trx) => {
    const invoiceNumber = await invoiceRepo.assignInvoiceNumber(hospitalId, trx);
    return invoiceRepo.update(id, hospitalId, {
      invoice_number: invoiceNumber,
      status: INVOICE_STATUS.PENDING,
      ...totals,
    }, trx);
  });

  await auditLog({
    hospitalId, userId, action: 'INVOICE_FINALIZED', entityType: 'invoice', entityId: id,
    meta: { invoice_number: updated.invoice_number, total_amount: totals.total_amount },
  });

  return invoiceRepo.findByIdWithDetails(id, hospitalId);
}

/**
 * Record a payment against an invoice.
 * Determines new invoice status (pending → partial | paid, partial → paid).
 * Generates receipt PDF when status becomes 'paid'.
 */
async function recordPayment(invoiceId, data, actor) {
  const { userId, hospitalId } = actor;
  const { amount, payment_mode, payment_date, reference_number, notes } = data;

  const invoice = await assertInvoiceExists(invoiceId, hospitalId);

  const PAYABLE = [INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIAL];
  if (!PAYABLE.includes(invoice.status)) {
    const err = new Error(`Cannot record payment on invoice with status '${invoice.status}'.`);
    err.statusCode = 422; err.code = 'INVOICE_NOT_PAYABLE'; throw err;
  }

  // Validate reference number for non-cash modes
  validatePaymentReference(payment_mode, reference_number);

  const { totalPaid, totalRefunded } = await invoiceRepo.getPaymentSummary(invoiceId);
  const currentNetPaid = totalPaid - totalRefunded;
  const remaining = parseFloat(invoice.total_amount) - currentNetPaid;

  if (parseFloat(amount) > parseFloat(remaining.toFixed(2)) + 0.001) {
    const err = new Error(`Payment amount (${amount}) exceeds the remaining balance (${remaining.toFixed(2)}).`);
    err.statusCode = 422; err.code = 'PAYMENT_EXCEEDS_BALANCE'; throw err;
  }

  const newTotalPaid = currentNetPaid + parseFloat(amount);
  const isFullyPaid = newTotalPaid >= parseFloat(invoice.total_amount) - 0.001;
  const newStatus = isFullyPaid ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIAL;

  let receiptS3Key = null;

  await db.transaction(async (trx) => {
    await invoiceRepo.insertPayment({
      invoice_id: invoiceId,
      hospital_id: hospitalId,
      amount: parseFloat(amount),
      payment_mode,
      payment_date: payment_date || new Date(),
      reference_number: reference_number || null,
      notes: notes || null,
      recorded_by: userId,
    }, trx);

    await invoiceRepo.update(invoiceId, hospitalId, {
      status: newStatus,
      paid_amount: parseFloat(newTotalPaid.toFixed(2)),
    }, trx);

    // Receipt PDF on full payment
    if (isFullyPaid) {
      const fullInvoice = await invoiceRepo.findByIdWithDetails(invoiceId, hospitalId);
      const hospital = await db('hospitals').where({ id: hospitalId }).first();
      const patient = await invoiceRepo.findPatientById(invoice.patient_id, hospitalId);

      const pdfBuffer = await generateReceiptPdf({ invoice: fullInvoice, hospital, patient });
      receiptS3Key = `billing/${hospitalId}/${invoice.patient_id}/${invoiceId}/receipt.pdf`;
      await uploadBufferToS3(receiptS3Key, pdfBuffer, 'application/pdf');

      await invoiceRepo.insertPatientDocument({
        patient_id: invoice.patient_id,
        hospital_id: hospitalId,
        uploaded_by: userId,
        file_name: `receipt_${invoice.invoice_number || invoiceId}.pdf`,
        s3_key: receiptS3Key,
        mime_type: 'application/pdf',
        file_size_bytes: pdfBuffer.length,
        document_type: 'invoice_pdf',
      }, trx);
    }
  });

  await auditLog({
    hospitalId, userId, action: 'PAYMENT_RECORDED', entityType: 'invoice', entityId: invoiceId,
    meta: { amount, payment_mode, new_status: newStatus, is_fully_paid: isFullyPaid },
  });

  return invoiceRepo.findByIdWithDetails(invoiceId, hospitalId);
}

/**
 * Refund an invoice.
 * Inserts a negative payment row to preserve the append-only trail.
 * Sets status → refunded.
 */
async function refundInvoice(invoiceId, data, actor) {
  const { userId, hospitalId } = actor;
  const { refund_amount, refund_reason, refund_mode, note } = data;

  const invoice = await assertInvoiceExists(invoiceId, hospitalId);

  const REFUNDABLE = [INVOICE_STATUS.PAID, INVOICE_STATUS.PARTIAL];
  if (!REFUNDABLE.includes(invoice.status)) {
    const err = new Error(`Cannot refund invoice with status '${invoice.status}'. Only paid or partial invoices can be refunded.`);
    err.statusCode = 422; err.code = 'INVOICE_NOT_REFUNDABLE'; throw err;
  }

  const { refundableBalance } = await invoiceRepo.getPaymentSummary(invoiceId);

  if (parseFloat(refund_amount) > refundableBalance + 0.001) {
    const err = new Error(`Refund amount (${refund_amount}) exceeds the refundable balance (${refundableBalance.toFixed(2)}).`);
    err.statusCode = 422; err.code = 'INVOICE_NOT_REFUNDABLE'; throw err;
  }

  await db.transaction(async (trx) => {
    // Negative payment row — append-only trail
    await invoiceRepo.insertPayment({
      invoice_id: invoiceId,
      hospital_id: hospitalId,
      amount: -parseFloat(refund_amount), // negative = refund
      payment_mode: refund_mode,
      payment_date: new Date(),
      reference_number: null,
      notes: `REFUND — ${refund_reason}${note ? ` | ${note}` : ''}`,
      recorded_by: userId,
    }, trx);

    await invoiceRepo.update(invoiceId, hospitalId, {
      status: INVOICE_STATUS.REFUNDED,
      paid_amount: parseFloat((parseFloat(invoice.paid_amount) - parseFloat(refund_amount)).toFixed(2)),
    }, trx);
  });

  await auditLog({
    hospitalId, userId, action: 'INVOICE_REFUNDED', entityType: 'invoice', entityId: invoiceId,
    meta: { refund_amount, refund_reason, refund_mode },
  });

  return invoiceRepo.findByIdWithDetails(invoiceId, hospitalId);
}

/**
 * Void an invoice (draft or pending only).
 * Paid invoices cannot be voided — use refund flow instead.
 */
async function voidInvoice(invoiceId, data, actor) {
  const { userId, hospitalId } = actor;
  const { void_reason } = data;

  const invoice = await assertInvoiceExists(invoiceId, hospitalId);

  const VOIDABLE = [INVOICE_STATUS.DRAFT, INVOICE_STATUS.PENDING];
  if (!VOIDABLE.includes(invoice.status)) {
    const err = new Error(`Cannot void invoice with status '${invoice.status}'. Only draft or pending invoices can be voided.`);
    err.statusCode = 422; err.code = 'INVOICE_VOID_BLOCKED'; throw err;
  }

  await invoiceRepo.update(invoiceId, hospitalId, {
    status: INVOICE_STATUS.VOID,
    void_reason,
    voided_by: userId,
    voided_at: new Date(),
  });

  await auditLog({
    hospitalId, userId, action: 'INVOICE_VOIDED', entityType: 'invoice', entityId: invoiceId,
    meta: { void_reason, previous_status: invoice.status },
  });

  return invoiceRepo.findByIdWithDetails(invoiceId, hospitalId);
}

/**
 * Generate invoice PDF and return a pre-signed S3 URL.
 */
async function getInvoicePdf(invoiceId, actor) {
  const { userId, hospitalId } = actor;

  const invoice = await invoiceRepo.findByIdWithDetails(invoiceId, hospitalId);
  if (!invoice) {
    const err = new Error('Invoice not found.'); err.statusCode = 404; err.code = 'INVOICE_NOT_FOUND'; throw err;
  }

  const hospital = await db('hospitals').where({ id: hospitalId }).first();
  const patient = await invoiceRepo.findPatientById(invoice.patient_id, hospitalId);

  const pdfBuffer = await generateInvoicePdf({ invoice, hospital, patient });
  const s3Key = `billing/${hospitalId}/${invoice.patient_id}/${invoiceId}/invoice.pdf`;

  await uploadBufferToS3(s3Key, pdfBuffer, 'application/pdf');
  const { downloadUrl: presignedUrl } = await generateDownloadUrl(s3Key, hospitalId, invoiceId, userId, 'billing', 'invoice');

  await auditLog({ hospitalId, userId, action: 'INVOICE_PDF_ACCESSED', entityType: 'invoice', entityId: invoiceId, meta: { s3_key: s3Key } });

  return {
    invoice_id: invoiceId,
    invoice_number: invoice.invoice_number,
    pdf_url: presignedUrl,
    expires_in_seconds: 1800,
    expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
  };
}

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  addItem,
  removeItem,
  finalizeInvoice,
  recordPayment,
  refundInvoice,
  voidInvoice,
  getInvoicePdf,
};
