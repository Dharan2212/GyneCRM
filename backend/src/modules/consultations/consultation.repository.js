'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

const TABLE = 'consultations';

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Find a consultation by its ID, scoped to hospital.
 */
async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();
}

/**
 * Find a consultation by its linked appointment_id.
 * Enforces hospital scope and the 1:1 appointment relationship.
 */
async function findByAppointmentId(appointmentId, hospitalId) {
  return db(TABLE)
    .where({ appointment_id: appointmentId, hospital_id: hospitalId })
    .first();
}

/**
 * Return a paginated list of consultations for a patient.
 */
async function findAllByPatient(patientId, hospitalId, { page, limit, sortBy, sortDir, isFinalized }) {
  const offset = (page - 1) * limit;

  let query = db(TABLE).where({ patient_id: patientId, hospital_id: hospitalId });

  if (typeof isFinalized === 'boolean') {
    query = query.where('is_finalized', isFinalized);
  }

  const [{ count }] = await query.clone().count('id as count');

  const rows = await query
    .orderBy(sortBy, sortDir)
    .limit(limit)
    .offset(offset)
    .select([
      'id',
      'appointment_id',
      'patient_id',
      'doctor_id',
      'pregnancy_id',
      'consultation_outcome',
      'is_finalized',
      'finalized_at',
      'finalized_by',
      'created_at',
      'updated_at',
      // Exclude doctor_notes from list view — only returned on single GET
    ]);

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
 * Insert a new consultation record.
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
 * Update an existing consultation record.
 */
async function update(id, hospitalId, data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .where({ id, hospital_id: hospitalId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

// ─── Override logs ────────────────────────────────────────────────────────────

/**
 * Insert a single row into override_logs.
 * Called once per changed field during an override operation.
 * override_logs is APPEND-ONLY — no update/delete.
 */
async function insertOverrideLog(
  { hospitalId, userId, entityType, entityId, fieldChanged, oldValue, newValue, overrideReason, overrideNote },
  trx
) {
  const runner = trx || db;
  await runner('override_logs').insert({
    id: uuidv4(),
    hospital_id: hospitalId,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    field_changed: fieldChanged,
    old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
    new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
    override_reason: overrideReason,
    override_note: overrideNote || null,
    created_at: new Date(),
  });
}

// ─── Linked appointment helper ────────────────────────────────────────────────

/**
 * Fetch an appointment record to validate ownership and status.
 * Used during consultation creation.
 */
async function findAppointmentById(appointmentId, hospitalId) {
  return db('appointments')
    .where({ id: appointmentId, hospital_id: hospitalId })
    .first();
}

/**
 * Mark the linked appointment as 'completed' when consultation is finalized.
 */
async function markAppointmentCompleted(appointmentId, hospitalId, trx) {
  const runner = trx || db;
  await runner('appointments')
    .where({ id: appointmentId, hospital_id: hospitalId })
    .update({ status: 'completed', updated_at: new Date() });
}

// ─── Pregnancy helper ─────────────────────────────────────────────────────────

/**
 * Fetch an active pregnancy record to derive trimester for obstetric consultations.
 */
async function findPregnancyById(pregnancyId, hospitalId) {
  return db('pregnancies')
    .where({ id: pregnancyId, hospital_id: hospitalId })
    .first();
}

module.exports = {
  findById,
  findByAppointmentId,
  findAllByPatient,
  create,
  update,
  insertOverrideLog,
  findAppointmentById,
  markAppointmentCompleted,
  findPregnancyById,
};
