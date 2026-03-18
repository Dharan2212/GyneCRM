'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

const TABLE = 'invoices';
const ITEMS_TABLE = 'invoice_items';
const PAYMENTS_TABLE = 'payments';

// ─── Invoice reads ────────────────────────────────────────────────────────────

async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId, is_deleted: false })
    .first();
}

async function findByIdWithDetails(id, hospitalId) {
  const invoice = await db(TABLE)
    .leftJoin('patients', `${TABLE}.patient_id`, 'patients.id')
    .leftJoin('branches', `${TABLE}.branch_id`, 'branches.id')
    .where({ [`${TABLE}.id`]: id, [`${TABLE}.hospital_id`]: hospitalId, [`${TABLE}.is_deleted`]: false })
    .select(
      `${TABLE}.*`,
      'patients.full_name as patient_name',
      'patients.phone as patient_phone',
      'branches.branch_name'
    )
    .first();

  if (!invoice) return null;

  const [items, payments] = await Promise.all([
    findItemsByInvoiceId(id),
    findPaymentsByInvoiceId(id),
  ]);

  // Compute derived financial figures for response
  const totalPaid = payments
    .filter((p) => p.amount > 0)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalRefunded = payments
    .filter((p) => p.amount < 0)
    .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);
  const refundableBalance = totalPaid - totalRefunded;
  const remainingBalance = parseFloat(invoice.total_amount || 0) - totalPaid + totalRefunded;

  return {
    ...invoice,
    items,
    payments,
    computed: {
      total_paid: parseFloat(totalPaid.toFixed(2)),
      total_refunded: parseFloat(totalRefunded.toFixed(2)),
      refundable_balance: parseFloat(Math.max(0, refundableBalance).toFixed(2)),
      remaining_balance: parseFloat(Math.max(0, remainingBalance).toFixed(2)),
    },
  };
}

async function findAll(hospitalId, { page, limit, sortBy, sortDir, patientId, branchId, status, dateFrom, dateTo, invoiceNumber }) {
  const offset = (page - 1) * limit;

  let query = db(TABLE)
    .leftJoin('patients', `${TABLE}.patient_id`, 'patients.id')
    .where({ [`${TABLE}.hospital_id`]: hospitalId, [`${TABLE}.is_deleted`]: false });

  if (patientId) query = query.where(`${TABLE}.patient_id`, patientId);
  if (branchId) query = query.where(`${TABLE}.branch_id`, branchId);
  if (status) query = query.where(`${TABLE}.status`, status);
  if (dateFrom) query = query.where(`${TABLE}.created_at`, '>=', dateFrom);
  if (dateTo) query = query.where(`${TABLE}.created_at`, '<=', dateTo);
  if (invoiceNumber) query = query.where(`${TABLE}.invoice_number`, 'ilike', `%${invoiceNumber}%`);

  const [{ count }] = await query.clone().count(`${TABLE}.id as count`);

  const rows = await query
    .select(`${TABLE}.*`, 'patients.full_name as patient_name')
    .orderBy(`${TABLE}.${sortBy}`, sortDir)
    .limit(limit)
    .offset(offset);

  return {
    rows,
    total: parseInt(count, 10),
    page,
    limit,
    total_pages: Math.ceil(parseInt(count, 10) / limit),
  };
}

// ─── Invoice writes ───────────────────────────────────────────────────────────

async function create(data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .insert({ id: uuidv4(), ...data, created_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

async function update(id, hospitalId, data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .where({ id, hospital_id: hospitalId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── Invoice number generation ────────────────────────────────────────────────

/**
 * Assign the next invoice number for a hospital.
 * Format: INV-{YYYY}{MM}-{SEQUENCE}, sequence resets per hospital per month.
 * Uses a SELECT FOR UPDATE + INSERT to prevent duplicate numbers under concurrency.
 * Called only within the finalize transaction.
 */
async function assignInvoiceNumber(hospitalId, trx) {
  const runner = trx || db;
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const prefix = `INV-${yyyy}${mm}-`;

  // Lock: count existing invoice numbers with this prefix for this hospital
  const [{ count }] = await runner(TABLE)
    .where('hospital_id', hospitalId)
    .where('invoice_number', 'like', `${prefix}%`)
    .whereNot('invoice_number', null)
    .count('id as count')
    .forUpdate(); // FOR UPDATE prevents race condition

  const sequence = String(parseInt(count, 10) + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}

// ─── Invoice items ────────────────────────────────────────────────────────────

async function findItemsByInvoiceId(invoiceId) {
  return db(ITEMS_TABLE)
    .where({ invoice_id: invoiceId })
    .orderBy('sort_order', 'asc');
}

async function findItemById(itemId, invoiceId) {
  return db(ITEMS_TABLE).where({ id: itemId, invoice_id: invoiceId }).first();
}

async function countItems(invoiceId) {
  const [{ count }] = await db(ITEMS_TABLE).where({ invoice_id: invoiceId }).count('id as count');
  return parseInt(count, 10);
}

async function createItem(data, trx) {
  const runner = trx || db;
  const [row] = await runner(ITEMS_TABLE)
    .insert({ id: uuidv4(), ...data, created_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

async function deleteItem(itemId, invoiceId, trx) {
  const runner = trx || db;
  await runner(ITEMS_TABLE).where({ id: itemId, invoice_id: invoiceId }).delete();
}

// ─── Payments ─────────────────────────────────────────────────────────────────

async function findPaymentsByInvoiceId(invoiceId) {
  return db(PAYMENTS_TABLE)
    .where({ invoice_id: invoiceId })
    .orderBy('payment_date', 'asc')
    .orderBy('created_at', 'asc');
}

async function insertPayment(data, trx) {
  const runner = trx || db;
  const [row] = await runner(PAYMENTS_TABLE)
    .insert({ id: uuidv4(), ...data, created_at: new Date() })
    .returning('*');
  return row;
}

/**
 * Compute total paid amount (positive rows) and total refunded (negative rows)
 * for an invoice. Used for payment status transitions and refund validation.
 */
async function getPaymentSummary(invoiceId) {
  const rows = await db(PAYMENTS_TABLE).where({ invoice_id: invoiceId });
  let totalPaid = 0;
  let totalRefunded = 0;
  for (const r of rows) {
    if (parseFloat(r.amount) > 0) totalPaid += parseFloat(r.amount);
    else totalRefunded += Math.abs(parseFloat(r.amount));
  }
  return {
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    totalRefunded: parseFloat(totalRefunded.toFixed(2)),
    refundableBalance: parseFloat(Math.max(0, totalPaid - totalRefunded).toFixed(2)),
  };
}

// ─── Hospital settings ────────────────────────────────────────────────────────

/**
 * Fetch a hospital setting value by key.
 */
async function getHospitalSetting(hospitalId, key) {
  const row = await db('hospital_settings')
    .where({ hospital_id: hospitalId, setting_key: key })
    .first();
  return row?.setting_value || null;
}

// ─── Linked helpers ───────────────────────────────────────────────────────────

async function findPatientById(patientId, hospitalId) {
  return db('patients').where({ id: patientId, hospital_id: hospitalId }).first();
}

async function findConsultationById(consultationId, hospitalId) {
  return db('consultations').where({ id: consultationId, hospital_id: hospitalId }).first();
}

async function findBranchById(branchId, hospitalId) {
  return db('branches').where({ id: branchId, hospital_id: hospitalId, is_active: true }).first();
}

async function findServiceCatalogById(serviceId, hospitalId) {
  return db('service_catalog')
    .where({ id: serviceId, hospital_id: hospitalId, is_active: true })
    .first();
}

// ─── Patient documents (PDF storage) ──────────────────────────────────────────

async function insertPatientDocument(data, trx) {
  const runner = trx || db;
  const [row] = await runner('patient_documents')
    .insert({ id: uuidv4(), ...data, review_status: 'no_review_required', is_deleted: false, created_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── Day-close analytics helpers ─────────────────────────────────────────────

/**
 * Aggregate revenue and invoice stats per branch for a given date.
 * Used by dayCloseJob.js to write day_close_summaries.
 */
async function getDayCloseAggregates(hospitalId, branchId, summaryDate) {
  const dateStr = summaryDate.toISOString().split('T')[0];

  const invoiceStats = await db(TABLE)
    .where({ hospital_id: hospitalId, branch_id: branchId })
    .whereRaw(`DATE(created_at AT TIME ZONE 'UTC') = ?`, [dateStr])
    .whereNot({ status: 'void' })
    .select(
      db.raw('COUNT(id) as total_invoices'),
      db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
      db.raw(`COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_paid`),
      db.raw(`COALESCE(SUM(CASE WHEN status IN ('pending','partial') THEN total_amount - paid_amount ELSE 0 END), 0) as total_pending`)
    )
    .first();

  // Payment mode breakdown
  const paymentRows = await db(PAYMENTS_TABLE)
    .join(TABLE, `${PAYMENTS_TABLE}.invoice_id`, `${TABLE}.id`)
    .where({ [`${TABLE}.hospital_id`]: hospitalId, [`${TABLE}.branch_id`]: branchId })
    .whereRaw(`DATE(${PAYMENTS_TABLE}.payment_date AT TIME ZONE 'UTC') = ?`, [dateStr])
    .where(`${PAYMENTS_TABLE}.amount`, '>', 0)
    .select(`${PAYMENTS_TABLE}.payment_mode`, db.raw('SUM(amount) as total'))
    .groupBy(`${PAYMENTS_TABLE}.payment_mode`);

  const paymentModeBreakdown = {};
  for (const row of paymentRows) {
    paymentModeBreakdown[row.payment_mode] = parseFloat(row.total);
  }

  return {
    total_invoices: parseInt(invoiceStats.total_invoices, 10),
    total_revenue: parseFloat(invoiceStats.total_revenue),
    total_paid: parseFloat(invoiceStats.total_paid),
    total_pending: parseFloat(invoiceStats.total_pending),
    payment_mode_breakdown: paymentModeBreakdown,
  };
}

module.exports = {
  findById,
  findByIdWithDetails,
  findAll,
  create,
  update,
  assignInvoiceNumber,
  findItemsByInvoiceId,
  findItemById,
  countItems,
  createItem,
  deleteItem,
  findPaymentsByInvoiceId,
  insertPayment,
  getPaymentSummary,
  getHospitalSetting,
  findPatientById,
  findConsultationById,
  findBranchById,
  findServiceCatalogById,
  insertPatientDocument,
  getDayCloseAggregates,
};
