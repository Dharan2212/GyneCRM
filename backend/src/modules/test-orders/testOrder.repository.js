'use strict';

const { v4: uuidv4 } = require('uuid');
const { db }         = require('../../db/connection');

const TABLE = 'patient_test_orders';

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Find a test order by ID, scoped to hospital.
 *
 * Batch 4 fix: patient_test_orders HAS its own hospital_id (migration 029).
 * We scope directly on pto.hospital_id — no need to traverse through patients.
 */
async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();
}

/**
 * Find a test order with enriched test catalog and patient details.
 *
 * Batch 4 fix: patients.name (not patients.full_name) — migration 013.
 */
async function findByIdWithDetails(id, hospitalId) {
  return db(TABLE)
    .join('patients',                `${TABLE}.patient_id`,     'patients.id')
    .leftJoin('test_catalog',        `${TABLE}.test_catalog_id`, 'test_catalog.id')
    .leftJoin('doctors',             `${TABLE}.ordered_by`,      'doctors.id')
    .leftJoin('users',               'doctors.user_id',          'users.id')
    .where(`${TABLE}.id`,            id)
    .where(`${TABLE}.hospital_id`,   hospitalId)
    .select(
      `${TABLE}.*`,
      'test_catalog.category as test_category',
      'test_catalog.preparation_notes',
      'users.name as ordered_by_name',
      'patients.name as patient_name',    // patients.name — migration 013
      'patients.phone as patient_phone',
      'patients.whatsapp_number as patient_whatsapp',
    )
    .first();
}

/**
 * Paginated, filtered list of test orders for a hospital.
 *
 * Batch 4 fix: patients.name not patients.full_name.
 * Scoped on TABLE.hospital_id directly.
 */
async function findAll(hospitalId, { page, limit, sortBy, sortDir, patientId, pregnancyId, status, orderedBy, dueDateFrom, dueDateTo }) {
  const offset = (page - 1) * limit;

  let query = db(TABLE)
    .join('patients',         `${TABLE}.patient_id`,      'patients.id')
    .leftJoin('test_catalog', `${TABLE}.test_catalog_id`, 'test_catalog.id')
    .where(`${TABLE}.hospital_id`, hospitalId);

  if (patientId)   query = query.where(`${TABLE}.patient_id`,  patientId);
  if (pregnancyId) query = query.where(`${TABLE}.pregnancy_id`, pregnancyId);
  if (status)      query = query.where(`${TABLE}.status`,       status);
  if (orderedBy)   query = query.where(`${TABLE}.ordered_by`,   orderedBy);
  if (dueDateFrom) query = query.where(`${TABLE}.due_date`, '>=', dueDateFrom);
  if (dueDateTo)   query = query.where(`${TABLE}.due_date`, '<=', dueDateTo);

  const [{ count }] = await query.clone().count(`${TABLE}.id as count`);

  const rows = await query
    .select(
      `${TABLE}.*`,
      'test_catalog.test_name as catalog_test_name',
      'test_catalog.test_code as catalog_test_code',
      'patients.name as patient_name',     // patients.name — migration 013
    )
    .orderBy(`${TABLE}.${sortBy}`, sortDir)
    .limit(limit)
    .offset(offset);

  return {
    rows,
    total:       parseInt(count, 10),
    page,
    limit,
    total_pages: Math.ceil(parseInt(count, 10) / limit),
  };
}

/**
 * All overdue orders for hospital.
 * Batch 4 fix: patients.name not patients.full_name.
 */
async function findOverdue(hospitalId, { page, limit, orderedBy }) {
  const offset = (page - 1) * limit;
  const today  = new Date().toISOString().split('T')[0];

  let query = db(TABLE)
    .join('patients',         `${TABLE}.patient_id`,      'patients.id')
    .leftJoin('test_catalog', `${TABLE}.test_catalog_id`, 'test_catalog.id')
    .leftJoin('doctors',      `${TABLE}.ordered_by`,      'doctors.id')
    .leftJoin('users',        'doctors.user_id',          'users.id')
    .where(`${TABLE}.hospital_id`, hospitalId)
    .whereIn(`${TABLE}.status`,    ['ordered', 'pending'])
    .where(`${TABLE}.due_date`,    '<', today);

  if (orderedBy) query = query.where(`${TABLE}.ordered_by`, orderedBy);

  const [{ count }] = await query.clone().count(`${TABLE}.id as count`);

  const rows = await query
    .select(
      `${TABLE}.*`,
      'users.name as ordered_by_name',
      'patients.name as patient_name',     // patients.name — migration 013
    )
    .orderBy(`${TABLE}.due_date`, 'asc')
    .limit(limit)
    .offset(offset);

  return {
    rows,
    total:       parseInt(count, 10),
    page,
    limit,
    total_pages: Math.ceil(parseInt(count, 10) / limit),
  };
}

// ─── Writes ───────────────────────────────────────────────────────────────────

async function create(data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .insert({ id: uuidv4(), ...data, created_at: new Date(), updated_at: new Date() })
    .returning('*');
  return row;
}

async function update(id, data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── Cron support ─────────────────────────────────────────────────────────────

/**
 * Legacy helper used by batchMarkOverdue in testOrder.service.js.
 * The testOverdueJob.js now handles per-row dispatch directly.
 */
async function batchMarkOverdue() {
  const today   = new Date().toISOString().split('T')[0];
  const updated = await db(TABLE)
    .whereIn('status', ['ordered', 'pending'])
    .where('due_date', '<', today)
    .update({ status: 'overdue', updated_at: new Date() });
  return updated;
}

// ─── Linked helpers ───────────────────────────────────────────────────────────

async function findPatientById(patientId, hospitalId) {
  return db('patients').where({ id: patientId, hospital_id: hospitalId }).first();
}

async function findConsultationById(consultationId, hospitalId) {
  return db('consultations').where({ id: consultationId, hospital_id: hospitalId }).first();
}

async function findPregnancyById(pregnancyId, hospitalId) {
  return db('pregnancies').where({ id: pregnancyId, hospital_id: hospitalId }).first();
}

async function findTestCatalogById(testCatalogId) {
  return db('test_catalog').where({ id: testCatalogId, is_active: true }).first();
}

async function findDocumentById(docId, hospitalId) {
  return db('patient_documents')
    .where({ id: docId, hospital_id: hospitalId, is_deleted: false })
    .first();
}

module.exports = {
  findById,
  findByIdWithDetails,
  findAll,
  findOverdue,
  create,
  update,
  batchMarkOverdue,
  findPatientById,
  findConsultationById,
  findPregnancyById,
  findTestCatalogById,
  findDocumentById,
};
