'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

// ─── Document reads ───────────────────────────────────────────────────────────

/**
 * Find a patient document by ID, scoped to hospital.
 * Excludes soft-deleted records by default; pass includeSoftDeleted=true for admin restore.
 */
async function findDocumentById(id, hospitalId, includeSoftDeleted = false) {
  let query = db('patient_documents').where({ id, hospital_id: hospitalId });
  if (!includeSoftDeleted) query = query.where({ is_deleted: false });
  return query.first();
}

/**
 * Review inbox: pending_review documents, hospital-scoped.
 */
async function findReviewInbox(hospitalId, { page, limit, sortBy, sortDir, patientId, documentType }) {
  const offset = (page - 1) * limit;

  let query = db('patient_documents')
    .leftJoin('patients', 'patient_documents.patient_id', 'patients.id')
    .where('patient_documents.hospital_id', hospitalId)
    .where('patient_documents.review_status', 'pending_review')
    .where('patient_documents.is_deleted', false);

  if (patientId) query = query.where('patient_documents.patient_id', patientId);
  if (documentType) query = query.where('patient_documents.document_type', documentType);

  const [{ count }] = await query.clone().count('patient_documents.id as count');

  const rows = await query
    .select(
      'patient_documents.*',
      'patients.full_name as patient_name',
      'patients.phone as patient_phone'
    )
    .orderBy(`patient_documents.${sortBy}`, sortDir)
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

// ─── Document writes ──────────────────────────────────────────────────────────

async function updateDocument(id, hospitalId, data, trx) {
  const runner = trx || db;
  const [row] = await runner('patient_documents')
    .where({ id, hospital_id: hospitalId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── test_result_reviews ──────────────────────────────────────────────────────

/**
 * Insert a test_result_reviews row — created on every document review action.
 * Architecture Part 20.5 column names.
 */
async function createTestResultReview(data, trx) {
  const runner = trx || db;
  const [row] = await runner('test_result_reviews')
    .insert({
      id: uuidv4(),
      ...data,
      reviewed_at: new Date(),
    })
    .returning('*');
  return row;
}

/**
 * Find existing test_result_review for a document (for idempotency checks).
 */
async function findReviewByDocumentId(documentId) {
  return db('test_result_reviews').where({ document_id: documentId }).first();
}

// ─── Lab reference ranges ─────────────────────────────────────────────────────

/**
 * Fetch reference ranges for a test_code, preferring hospital-specific
 * over system-default (hospital_id = null).
 *
 * Returns all parameter rows for the test_code so caller can compare each
 * extracted value.
 */
async function findReferenceRanges(testCode, hospitalId) {
  // Fetch both hospital-specific and system default ranges
  const ranges = await db('lab_reference_ranges')
    .where({ test_code: testCode })
    .where(function () {
      this.where('hospital_id', hospitalId).orWhereNull('hospital_id');
    })
    .select('*');

  // Deduplicate: hospital-specific wins over system default per parameter
  const byParam = {};
  for (const range of ranges) {
    const key = range.parameter_name;
    if (!byParam[key]) {
      byParam[key] = range;
    } else if (range.hospital_id === hospitalId) {
      // Hospital-specific overrides system default
      byParam[key] = range;
    }
  }

  return Object.values(byParam);
}

// ─── Notifications (admin alert on critical/abnormal) ─────────────────────────

/**
 * Insert an in-app notification record.
 * Used for: critical flag → admin alert, abnormal flag → admin alert.
 */
async function insertNotification(data, trx) {
  const runner = trx || db;
  await runner('notifications').insert({
    id: uuidv4(),
    ...data,
    status: 'pending',
    sent_at: null,
    created_at: new Date(),
  });
}

// ─── Override logs ────────────────────────────────────────────────────────────

async function insertOverrideLog(data, trx) {
  const runner = trx || db;
  await runner('override_logs').insert({
    id: uuidv4(),
    ...data,
    created_at: new Date(),
  });
}

// ─── Linked helpers ───────────────────────────────────────────────────────────

async function findTestOrderById(testOrderId) {
  return db('patient_test_orders').where({ id: testOrderId }).first();
}

async function updateTestOrderStatus(testOrderId, status, extra, trx) {
  const runner = trx || db;
  await runner('patient_test_orders')
    .where({ id: testOrderId })
    .update({ status, ...extra, updated_at: new Date() });
}

module.exports = {
  findDocumentById,
  findReviewInbox,
  updateDocument,
  createTestResultReview,
  findReviewByDocumentId,
  findReferenceRanges,
  insertNotification,
  insertOverrideLog,
  findTestOrderById,
  updateTestOrderStatus,
};
