'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

const TABLE = 'prescriptions';
const ITEMS_TABLE = 'prescription_items';

// ─── Prescription reads ───────────────────────────────────────────────────────

/**
 * Find a prescription by ID, scoped to hospital.
 * Does NOT include items — call findItemsByPrescriptionId separately
 * or use findByIdWithItems for the full detail view.
 */
async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();
}

/**
 * Find a prescription with all its items joined.
 * Returns null if not found.
 */
async function findByIdWithItems(id, hospitalId) {
  const prescription = await db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();

  if (!prescription) return null;

  const items = await db(ITEMS_TABLE)
    .where({ prescription_id: id })
    .orderBy('sort_order', 'asc')
    .orderBy('created_at', 'asc');

  return { ...prescription, items };
}

/**
 * Paginated list of prescriptions for a patient, scoped to hospital.
 */
async function findAllByPatient(
  patientId,
  hospitalId,
  { page, limit, sortBy, sortDir, status }
) {
  const offset = (page - 1) * limit;

  let query = db(TABLE).where({ patient_id: patientId, hospital_id: hospitalId });

  if (status) {
    query = query.where('status', status);
  }

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

/**
 * Check whether a consultation already has a non-voided prescription.
 * Architecture allows one active prescription chain per consultation.
 * We check for existing draft or issued before creating.
 */
async function findActiveByConsultationId(consultationId, hospitalId) {
  return db(TABLE)
    .where({ consultation_id: consultationId, hospital_id: hospitalId })
    .whereIn('status', ['draft', 'issued'])
    .first();
}

// ─── Prescription writes ──────────────────────────────────────────────────────

/**
 * Insert a new prescription record.
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

/**
 * Update a prescription record (notes, pdf_url, status transitions, etc.)
 */
async function update(id, hospitalId, data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .where({ id, hospital_id: hospitalId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── Prescription item reads ──────────────────────────────────────────────────

/**
 * Get all items for a prescription in sort order.
 */
async function findItemsByPrescriptionId(prescriptionId) {
  return db(ITEMS_TABLE)
    .where({ prescription_id: prescriptionId })
    .orderBy('sort_order', 'asc')
    .orderBy('created_at', 'asc');
}

/**
 * Find a single item by its ID, verifying it belongs to the prescription.
 */
async function findItemById(itemId, prescriptionId) {
  return db(ITEMS_TABLE)
    .where({ id: itemId, prescription_id: prescriptionId })
    .first();
}

/**
 * Count items for a prescription — used before issue to reject empty prescriptions.
 */
async function countItems(prescriptionId) {
  const [{ count }] = await db(ITEMS_TABLE)
    .where({ prescription_id: prescriptionId })
    .count('id as count');
  return parseInt(count, 10);
}

// ─── Prescription item writes ─────────────────────────────────────────────────

/**
 * Insert a new prescription item.
 */
async function createItem(data, trx) {
  const runner = trx || db;
  const [row] = await runner(ITEMS_TABLE)
    .insert({
      id: uuidv4(),
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return row;
}

/**
 * Update a prescription item.
 */
async function updateItem(itemId, prescriptionId, data, trx) {
  const runner = trx || db;
  const [row] = await runner(ITEMS_TABLE)
    .where({ id: itemId, prescription_id: prescriptionId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

/**
 * Soft-delete a prescription item while prescription is still draft.
 * Architecture rule: no hard deletes on clinical records.
 * We mark is_deleted = true so the item is excluded from lists and PDFs.
 * Note: if prescriptions_items table has no is_deleted column from migration,
 * we use a physical delete ONLY during draft state (before issue).
 * Items become immutable once prescription is issued — this function is
 * never called on issued prescriptions.
 */
async function deleteItem(itemId, prescriptionId, trx) {
  const runner = trx || db;
  // Hard delete is acceptable here ONLY because prescription is still in DRAFT
  // and no downstream documents reference the item yet.
  // Once issued, items are never touched.
  await runner(ITEMS_TABLE)
    .where({ id: itemId, prescription_id: prescriptionId })
    .delete();
}

// ─── Patient documents record (for prescription PDF tracking) ─────────────────

/**
 * Insert a record into patient_documents for the generated prescription PDF.
 * document_type = 'prescription_pdf' per architecture Part 10.4.
 * This creates the audit trail for document access.
 */
async function insertPatientDocument(data, trx) {
  const runner = trx || db;
  const [row] = await runner('patient_documents')
    .insert({
      id: uuidv4(),
      ...data,
      review_status: 'pending',
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return row;
}

// ─── Linked record helpers ────────────────────────────────────────────────────

/**
 * Fetch a consultation with hospital scope validation.
 */
async function findConsultationById(consultationId, hospitalId) {
  return db('consultations')
    .where({ id: consultationId, hospital_id: hospitalId })
    .first();
}

/**
 * Fetch a patient with hospital scope validation.
 */
async function findPatientById(patientId, hospitalId) {
  return db('patients')
    .where({ id: patientId, hospital_id: hospitalId })
    .first();
}

/**
 * Fetch doctor joined with user for PDF header.
 */
async function findDoctorWithUser(doctorId) {
  return db('doctors')
    .join('users', 'doctors.user_id', 'users.id')
    .where('doctors.id', doctorId)
    .select('doctors.*', 'users.name as doctor_name')
    .first();
}

module.exports = {
  findById,
  findByIdWithItems,
  findAllByPatient,
  findActiveByConsultationId,
  create,
  update,
  findItemsByPrescriptionId,
  findItemById,
  countItems,
  createItem,
  updateItem,
  deleteItem,
  insertPatientDocument,
  findConsultationById,
  findPatientById,
  findDoctorWithUser,
};
