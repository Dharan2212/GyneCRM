'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

const TABLE = 'patient_documents';

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Find a document by ID, scoped to hospital.
 * Soft-deleted documents are hidden by default.
 * Pass includeSoftDeleted=true for admin-level access.
 */
async function findById(id, hospitalId, includeSoftDeleted = false) {
  let query = db(TABLE).where({ id, hospital_id: hospitalId });
  if (!includeSoftDeleted) query = query.where({ is_deleted: false });
  return query.first();
}

/**
 * Paginated list of documents for a patient.
 * Soft-deleted records hidden unless admin explicitly requests them.
 */
async function findAllByPatient(
  patientId,
  hospitalId,
  { page, limit, sortBy, sortDir, documentType, reviewStatus, includeDeleted }
) {
  const offset = (page - 1) * limit;

  let query = db(TABLE).where({ patient_id: patientId, hospital_id: hospitalId });

  if (!includeDeleted) query = query.where({ is_deleted: false });

  if (documentType) query = query.where({ document_type: documentType });
  if (reviewStatus) query = query.where({ review_status: reviewStatus });

  const [{ count }] = await query.clone().count('id as count');

  const rows = await query
    .orderBy(sortBy, sortDir)
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

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Insert a new patient_documents row.
 * Called after successful S3 upload confirmed by client.
 */
async function create(data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .insert({
      id: uuidv4(),
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return row;
}

// ─── Linked record validation helpers ────────────────────────────────────────

async function findPatientById(patientId, hospitalId) {
  return db('patients').where({ id: patientId, hospital_id: hospitalId }).first();
}

async function findConsultationById(consultationId, hospitalId) {
  return db('consultations').where({ id: consultationId, hospital_id: hospitalId }).first();
}

async function findPregnancyById(pregnancyId, hospitalId) {
  return db('pregnancies').where({ id: pregnancyId, hospital_id: hospitalId }).first();
}

/**
 * Find a test order scoped via patient join (patient_test_orders has no direct hospital_id).
 */
async function findTestOrderById(testOrderId, patientId) {
  return db('patient_test_orders')
    .where({ id: testOrderId, patient_id: patientId })
    .first();
}

module.exports = {
  findById,
  findAllByPatient,
  create,
  findPatientById,
  findConsultationById,
  findPregnancyById,
  findTestOrderById,
};
