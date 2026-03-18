'use strict';

const { v4: uuidv4 } = require('uuid');
const { db }         = require('../../db/connection');

const TABLE = 'pregnancies';

// ─── Pregnancy reads ──────────────────────────────────────────────────────────

/**
 * Find a pregnancy by ID, scoped to hospital.
 */
async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();
}

/**
 * Find a pregnancy with full linked doctor and patient info for response enrichment.
 * Also fetches patient name and whatsapp_number for automation payloads.
 */
async function findByIdWithDetails(id, hospitalId) {
  return db(TABLE)
    .leftJoin('doctors',   'pregnancies.doctor_id',   'doctors.id')
    .leftJoin('users',     'doctors.user_id',          'users.id')
    .leftJoin('patients',  'pregnancies.patient_id',   'patients.id')
    .where({ 'pregnancies.id': id, 'pregnancies.hospital_id': hospitalId })
    .select(
      'pregnancies.*',
      'users.name as doctor_name',
      'doctors.specialisation as doctor_specialisation',
      'doctors.registration_number as doctor_registration_number',
      'patients.name as patient_name',
      'patients.phone as patient_phone',
      'patients.whatsapp_number as patient_whatsapp',
    )
    .first();
}

/**
 * Paginated list of pregnancies for a patient, newest first.
 * Active pregnancies are sorted to the top regardless of sort_dir.
 */
async function findAllByPatient(patientId, hospitalId, { page, limit, sortBy, sortDir, status }) {
  const offset = (page - 1) * limit;

  let query = db(TABLE).where({ patient_id: patientId, hospital_id: hospitalId });

  if (status) {
    query = query.where('status', status);
  }

  const [{ count }] = await query.clone().count('id as count');

  const rows = await query
    .orderByRaw(`CASE WHEN status = 'active' THEN 0 ELSE 1 END ASC`)
    .orderBy(sortBy, sortDir)
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
 * Fetch all active pregnancies across a hospital.
 * Used by the daily cron job to recalculate pregnancy_week.
 */
async function findAllActiveByHospital(hospitalId) {
  return db(TABLE)
    .where({ hospital_id: hospitalId, status: 'active' })
    .select('id', 'lmp_date', 'pregnancy_week', 'hospital_id', 'patient_id', 'doctor_id');
}

/**
 * Fetch ALL active pregnancies across ALL hospitals, including patient info.
 * Used by the system-level cron (pregnancyWeekJob, weeklyTipsJob).
 *
 * Batch 3 fix: select lmp_date (actual column name in migration 016).
 * Batch 3 fix: join patients to get name and whatsapp_number for dispatch payloads.
 * Batch 3 fix: join hospitals to get hospital name for dispatch payloads.
 * Batch 3 fix: join doctors/users to get doctor_name for dispatch payloads.
 */
async function findAllActiveGlobally() {
  return db(TABLE)
    .join('patients as p',       'pregnancies.patient_id',   'p.id')
    .join('hospitals as h',      'pregnancies.hospital_id',  'h.id')
    .leftJoin('doctors as d',    'pregnancies.doctor_id',    'd.id')
    .leftJoin('users as u',      'd.user_id',                'u.id')
    .where({ 'pregnancies.status': 'active' })
    .whereNotNull('pregnancies.lmp_date')
    .select(
      'pregnancies.id',
      'pregnancies.hospital_id',
      'pregnancies.patient_id',
      'pregnancies.doctor_id',
      'pregnancies.lmp_date',                  // real column name — migration 016
      'pregnancies.pregnancy_week',
      'p.name as patient_name',                // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'h.name as hospital_name',               // hospitals.name — migration 001
      'h.phone as hospital_phone',
      'u.name as doctor_name',                 // users.name — migration 009
    );
}

// ─── Pregnancy writes ─────────────────────────────────────────────────────────

async function create(data, trx) {
  const runner = trx || db;
  const [row] = await runner(TABLE)
    .insert({
      id:         uuidv4(),
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
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

/**
 * Batch update pregnancy_week for multiple pregnancies.
 * Used by cron to avoid per-row UPDATE round-trips.
 *
 * @param {Array<{ id: string, pregnancy_week: number }>} updates
 */
async function batchUpdateWeeks(updates) {
  for (const { id, pregnancy_week } of updates) {
    await db(TABLE)
      .where({ id })
      .update({ pregnancy_week, updated_at: new Date() });
  }
}

// ─── Override logs ────────────────────────────────────────────────────────────

async function insertOverrideLog(
  { hospitalId, userId, entityType, entityId, fieldChanged, oldValue, newValue, overrideReason, overrideNote },
  trx,
) {
  const runner = trx || db;
  await runner('override_logs').insert({
    id:              uuidv4(),
    hospital_id:     hospitalId,
    user_id:         userId,
    entity_type:     entityType,
    entity_id:       entityId,
    field_changed:   fieldChanged,
    old_value:       oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
    new_value:       newValue !== undefined && newValue !== null ? String(newValue) : null,
    override_reason: overrideReason,
    override_note:   overrideNote || null,
    created_at:      new Date(),
  });
}

// ─── Protocol milestone reads ─────────────────────────────────────────────────

/**
 * Fetch the active antenatal/obstetric protocol for a hospital.
 *
 * Batch 3 fix: hospital_protocols column is 'name' not 'protocol_name'.
 */
async function findActiveProtocol(hospitalId) {
  return db('hospital_protocols')
    .where({ hospital_id: hospitalId, is_active: true })
    .orderBy('created_at', 'desc')
    .first();
}

/**
 * Fetch all milestones for a protocol, ordered by week ascending.
 *
 * Batch 3 fixes:
 *   - Column is 'week_number' NOT 'milestone_week' (arch doc + migration 038)
 *   - protocol_milestones has NO hospital_id column
 *   - protocol_milestones has NO is_active column
 *   - Orders by week_number ascending
 *
 * @param {string} protocolId
 * @returns {Promise<Array>}
 */
async function findMilestonesByProtocol(protocolId) {
  return db('protocol_milestones')
    .where({ protocol_id: protocolId })
    .orderBy('week_number', 'asc')
    .select(
      'id',
      'protocol_id',
      'week_number',    // actual column — arch doc Section 23.x + migration 038
      'milestone_name', // actual column — migration 038
      'description',
      'is_critical',
    );
}

async function findOverrideLogsByPregnancy(pregnancyId, hospitalId) {
  return db('override_logs')
    .where({ entity_id: pregnancyId, entity_type: 'pregnancy', hospital_id: hospitalId })
    .orderBy('created_at', 'desc');
}

// ─── Linked record helpers ────────────────────────────────────────────────────

async function findPatientById(patientId, hospitalId) {
  return db('patients')
    .where({ id: patientId, hospital_id: hospitalId })
    .first();
}

async function findDoctorById(doctorId, hospitalId) {
  return db('doctors')
    .where({ id: doctorId, hospital_id: hospitalId })
    .first();
}

async function findConsultationsByPregnancy(pregnancyId, hospitalId) {
  return db('consultations')
    .where({ pregnancy_id: pregnancyId, hospital_id: hospitalId })
    .orderBy('created_at', 'asc')
    .select([
      'id', 'appointment_id', 'doctor_id', 'consultation_outcome',
      'is_finalized', 'finalized_at', 'created_at',
    ]);
}

module.exports = {
  findById,
  findByIdWithDetails,
  findAllByPatient,
  findAllActiveByHospital,
  findAllActiveGlobally,
  create,
  update,
  batchUpdateWeeks,
  insertOverrideLog,
  findActiveProtocol,
  findMilestonesByProtocol,
  findOverrideLogsByPregnancy,
  findPatientById,
  findDoctorById,
  findConsultationsByPregnancy,
};
