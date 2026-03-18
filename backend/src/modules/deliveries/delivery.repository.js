'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../db/connection');

/**
 * Delivery Repository
 * Knex query builder style — consistent with all other project repositories.
 * Hospital-scoped. No raw pg client. No hard deletes.
 */

// ─── Patient / Doctor validation helpers ──────────────────────────────────────

async function findPatientInHospital(patientId, hospitalId, trx) {
  const runner = trx || db;
  return runner('patients')
    .where({ id: patientId, hospital_id: hospitalId, is_deleted: false })
    .first();
}

async function findDoctorInHospital(doctorId, hospitalId, trx) {
  const runner = trx || db;
  return runner('doctors')
    .where({ id: doctorId, hospital_id: hospitalId, is_active: true })
    .first();
}

// ─── Pregnancy helpers ─────────────────────────────────────────────────────────

async function findActivePregnancyForDelivery(pregnancyId, patientId, hospitalId, trx) {
  const runner = trx || db;
  return runner('pregnancies')
    .where({ id: pregnancyId, hospital_id: hospitalId, patient_id: patientId, is_deleted: false })
    .first();
}

async function findDeliveryByPregnancyId(pregnancyId, trx) {
  const runner = trx || db;
  return runner('deliveries').where({ pregnancy_id: pregnancyId }).first();
}

async function closePregnancy(pregnancyId, deliveryDate, trx) {
  const runner = trx || db;
  await runner('pregnancies')
    .where({ id: pregnancyId })
    .update({ status: 'delivered', delivery_date: deliveryDate, updated_at: new Date() });
}

// ─── Delivery CRUD ─────────────────────────────────────────────────────────────

async function insertDelivery(data, trx) {
  const runner = trx || db;
  const [row] = await runner('deliveries')
    .insert({
      id: uuidv4(),
      hospital_id: data.hospitalId,
      pregnancy_id: data.pregnancyId,
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      delivery_date: data.deliveryDate,
      delivery_time: data.deliveryTime || null,
      delivery_type: data.deliveryType,
      gestational_age_weeks: data.gestationalAgeWeeks || null,
      onset_of_labour: data.onsetOfLabour || null,
      anaesthesia_type: data.anaesthesiaType || null,
      complications: data.complications || null,
      birth_outcome: data.birthOutcome,
      notes: data.notes || null,
      created_by: data.createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return row;
}

async function findDeliveryById(deliveryId, hospitalId) {
  return db('deliveries as d')
    .join('pregnancies as p', 'p.id', 'd.pregnancy_id')
    .join('patients as pt', 'pt.id', 'd.patient_id')
    .join('doctors as doc', 'doc.id', 'd.doctor_id')
    .join('users as u', 'u.id', 'doc.user_id')
    .where({ 'd.id': deliveryId, 'd.hospital_id': hospitalId })
    .select(
      'd.*',
      'p.lmp', 'p.edd', 'p.gravida', 'p.para', 'p.status as pregnancy_status',
      'pt.full_name as patient_name', 'pt.phone as patient_phone',
      'u.name as doctor_name'
    )
    .first();
}

async function findNeonatesByDeliveryId(deliveryId) {
  return db('neonates').where({ delivery_id: deliveryId }).orderBy('birth_order', 'asc');
}

async function findPostpartumByDeliveryId(deliveryId) {
  return db('postpartum_followups').where({ delivery_id: deliveryId }).orderBy('due_date', 'asc');
}

async function updateDelivery(deliveryId, hospitalId, updates, trx) {
  const runner = trx || db;
  const allowed = [
    'delivery_time', 'gestational_age_weeks', 'onset_of_labour',
    'anaesthesia_type', 'complications', 'notes',
  ];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      patch[key] = updates[key];
    }
  }
  if (Object.keys(patch).length === 0) return null;
  patch.updated_at = new Date();
  const [row] = await runner('deliveries')
    .where({ id: deliveryId, hospital_id: hospitalId })
    .update(patch)
    .returning('*');
  return row || null;
}

async function findDeliveriesByPatient(hospitalId, patientId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const total = await db('deliveries')
    .where({ hospital_id: hospitalId, patient_id: patientId })
    .count('id as count')
    .first()
    .then((r) => parseInt(r.count, 10));

  const rows = await db('deliveries as d')
    .join('doctors as doc', 'doc.id', 'd.doctor_id')
    .join('users as u', 'u.id', 'doc.user_id')
    .where({ 'd.hospital_id': hospitalId, 'd.patient_id': patientId })
    .select('d.id', 'd.delivery_date', 'd.delivery_type', 'd.birth_outcome',
      'd.gestational_age_weeks', 'd.created_at', 'u.name as doctor_name')
    .orderBy('d.delivery_date', 'desc')
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

// ─── Neonate insert ────────────────────────────────────────────────────────────

async function insertNeonates(neonates, trx) {
  const runner = trx || db;
  const inserted = [];
  for (const n of neonates) {
    const [row] = await runner('neonates')
      .insert({
        id: uuidv4(),
        delivery_id: n.delivery_id,
        patient_id: n.patient_id,
        birth_order: n.birth_order,
        sex: n.sex || null,
        birth_weight_kg: n.birth_weight_kg || null,
        apgar_1min: n.apgar_1min ?? null,
        apgar_5min: n.apgar_5min ?? null,
        head_circumference_cm: n.head_circumference_cm || null,
        birth_length_cm: n.birth_length_cm || null,
        nicu_required: n.nicu_required ?? false,
        nicu_reason: n.nicu_reason || null,
        outcome_notes: n.outcome_notes || null,
        created_at: new Date(),
      })
      .returning('*');
    inserted.push(row);
  }
  return inserted;
}

// ─── Postpartum followup insert / query / update ───────────────────────────────

async function insertPostpartumFollowups(followups, trx) {
  const runner = trx || db;
  const inserted = [];
  for (const f of followups) {
    const [row] = await runner('postpartum_followups')
      .insert({
        id: uuidv4(),
        delivery_id: f.delivery_id,
        patient_id: f.patient_id,
        doctor_id: f.doctor_id,
        due_date: f.due_date,
        visit_type: f.visit_type,
        status: 'scheduled',
        appointment_id: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    inserted.push(row);
  }
  return inserted;
}

async function findPostpartumFollowupsByPatient(patientId, { deliveryId, status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  let query = db('postpartum_followups as pf')
    .join('doctors as doc', 'doc.id', 'pf.doctor_id')
    .join('users as u', 'u.id', 'doc.user_id')
    .where('pf.patient_id', patientId);

  if (deliveryId) query = query.where('pf.delivery_id', deliveryId);
  if (status) query = query.where('pf.status', status);

  const total = await query.clone().count('pf.id as count').first().then((r) => parseInt(r.count, 10));

  const rows = await query
    .select('pf.*', 'u.name as doctor_name')
    .orderBy('pf.due_date', 'asc')
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

async function findPostpartumFollowupById(followupId, trx) {
  const runner = trx || db;
  return runner('postpartum_followups').where({ id: followupId }).first();
}

async function updatePostpartumFollowup(followupId, updates, trx) {
  const runner = trx || db;
  const allowed = ['status', 'appointment_id', 'notes'];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      patch[key] = updates[key];
    }
  }
  if (Object.keys(patch).length === 0) return null;
  patch.updated_at = new Date();
  const [row] = await runner('postpartum_followups')
    .where({ id: followupId })
    .update(patch)
    .returning('*');
  return row || null;
}

// ─── Analytics helpers ─────────────────────────────────────────────────────────

async function countDeliveriesThisMonth(hospitalId) {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const result = await db('deliveries')
    .where('hospital_id', hospitalId)
    .where('delivery_date', '>=', start.toISOString().split('T')[0])
    .count('id as count')
    .first();
  return parseInt(result.count, 10);
}

async function deliveryTypeBreakdown(hospitalId, { fromDate, toDate } = {}) {
  let query = db('deliveries').where({ hospital_id: hospitalId });
  if (fromDate) query = query.where('delivery_date', '>=', fromDate);
  if (toDate) query = query.where('delivery_date', '<=', toDate);
  return query
    .select('delivery_type', 'birth_outcome')
    .count('id as count')
    .groupBy('delivery_type', 'birth_outcome')
    .orderBy('count', 'desc');
}

module.exports = {
  findPatientInHospital,
  findDoctorInHospital,
  findActivePregnancyForDelivery,
  findDeliveryByPregnancyId,
  closePregnancy,
  insertDelivery,
  findDeliveryById,
  findNeonatesByDeliveryId,
  findPostpartumByDeliveryId,
  updateDelivery,
  findDeliveriesByPatient,
  insertNeonates,
  insertPostpartumFollowups,
  findPostpartumFollowupsByPatient,
  findPostpartumFollowupById,
  updatePostpartumFollowup,
  countDeliveriesThisMonth,
  deliveryTypeBreakdown,
};