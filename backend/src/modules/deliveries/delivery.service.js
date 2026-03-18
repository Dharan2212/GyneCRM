'use strict';

const { db } = require('../../db/connection');
const repo = require('./delivery.repository');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES = require('../../events/event-types');
const logger = require('../../utils/logger');

/**
 * Delivery Service
 * Uses db.transaction(async (trx) => {...}) consistent with all other project services.
 */

// ─── Inline utility ────────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Postpartum schedule builder ───────────────────────────────────────────────

function buildPostpartumSchedule({ deliveryId, patientId, doctorId, deliveryDate }) {
  const base = new Date(deliveryDate);
  return [
    { delivery_id: deliveryId, patient_id: patientId, doctor_id: doctorId,
      due_date: addDays(base, 7).toISOString().split('T')[0], visit_type: 'day7' },
    { delivery_id: deliveryId, patient_id: patientId, doctor_id: doctorId,
      due_date: addDays(base, 42).toISOString().split('T')[0], visit_type: 'week6' },
    { delivery_id: deliveryId, patient_id: patientId, doctor_id: doctorId,
      due_date: addDays(base, 84).toISOString().split('T')[0], visit_type: 'week12' },
  ];
}

// ─── CREATE DELIVERY ────────────────────────────────────────────────────────────

async function createDelivery(payload, actor) {
  const { hospitalId, userId } = actor;
  const {
    pregnancy_id, patient_id, doctor_id,
    delivery_date, delivery_time, delivery_type,
    gestational_age_weeks, onset_of_labour, anaesthesia_type,
    complications, birth_outcome, notes,
    neonates: neonatesPayload,
  } = payload;

  let delivery, neonates, followups;

  await db.transaction(async (trx) => {
    // 1. Verify patient in this hospital
    const patient = await repo.findPatientInHospital(patient_id, hospitalId, trx);
    if (!patient) {
      const err = new Error('Patient not found in this hospital.');
      err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    // 2. Verify doctor in this hospital
    const doctor = await repo.findDoctorInHospital(doctor_id, hospitalId, trx);
    if (!doctor) {
      const err = new Error('Doctor not found in this hospital.');
      err.statusCode = 404; err.code = 'DOCTOR_NOT_FOUND';
      throw err;
    }

    // 3. Verify pregnancy in this hospital + same patient
    const pregnancy = await repo.findActivePregnancyForDelivery(pregnancy_id, patient_id, hospitalId, trx);
    if (!pregnancy) {
      const err = new Error('Pregnancy not found, does not belong to this patient/hospital, or has been deleted.');
      err.statusCode = 404; err.code = 'PREGNANCY_NOT_FOUND';
      throw err;
    }

    // 4. Pregnancy must be active
    if (pregnancy.status !== 'active') {
      const err = new Error(`Cannot create delivery. Pregnancy status is '${pregnancy.status}'. Only active pregnancies can receive a delivery record.`);
      err.statusCode = 409; err.code = 'PREGNANCY_NOT_ACTIVE';
      throw err;
    }

    // 5. Guard duplicate delivery (belt-and-suspenders on UNIQUE constraint)
    const existing = await repo.findDeliveryByPregnancyId(pregnancy_id, trx);
    if (existing) {
      const err = new Error('A delivery record already exists for this pregnancy.');
      err.statusCode = 409; err.code = 'DELIVERY_ALREADY_EXISTS';
      throw err;
    }

    // 6. Validate birth_order uniqueness within neonates payload
    const birthOrders = neonatesPayload.map((n) => n.birth_order);
    if (new Set(birthOrders).size !== birthOrders.length) {
      const err = new Error('Each neonate must have a unique birth_order.');
      err.statusCode = 400; err.code = 'DUPLICATE_BIRTH_ORDER';
      throw err;
    }

    // 7. Insert delivery
    delivery = await repo.insertDelivery({
      hospitalId, pregnancyId: pregnancy_id, patientId: patient_id, doctorId: doctor_id,
      deliveryDate: delivery_date, deliveryTime: delivery_time, deliveryType: delivery_type,
      gestationalAgeWeeks: gestational_age_weeks, onsetOfLabour: onset_of_labour,
      anaesthesiaType: anaesthesia_type, complications, birthOutcome: birth_outcome,
      notes, createdBy: userId,
    }, trx);

    // 8. Insert neonate records
    const neonatesToInsert = neonatesPayload.map((n) => ({
      ...n, delivery_id: delivery.id, patient_id,
    }));
    neonates = await repo.insertNeonates(neonatesToInsert, trx);

    // 9. Close pregnancy
    await repo.closePregnancy(pregnancy_id, delivery_date, trx);

    // 10. Auto-create postpartum schedule
    const schedule = buildPostpartumSchedule({
      deliveryId: delivery.id, patientId: patient_id, doctorId: doctor_id, deliveryDate: delivery_date,
    });
    followups = await repo.insertPostpartumFollowups(schedule, trx);
  });

  // 11. Activity log (post-commit, append-only)
  await auditLog({
    hospitalId, userId,
    action: 'DELIVERY_CREATED',
    entityType: 'delivery',
    entityId: delivery.id,
    meta: {
      patient_id, pregnancy_id, delivery_type, birth_outcome,
      neonate_count: neonates.length,
      postpartum_followups_created: followups.length,
    },
  });

  // 12. Dispatch delivery_recorded event (fire-and-forget — does not block response)
  dispatchEvent(EVENT_TYPES.DELIVERY_RECORDED, {
    patientId: patient_id,
    entityType: 'delivery',
    entityId: delivery.id,
    pregnancyId: pregnancy_id,
    doctorId: doctor_id,
    deliveryDate: delivery_date,
    deliveryType: delivery_type,
    birthOutcome: birth_outcome,
    neonateCount: neonates.length,
    postpartumFollowups: followups.map((f) => ({ id: f.id, visit_type: f.visit_type, due_date: f.due_date })),
  }, hospitalId);

  return { delivery, neonates, followups };
}

// ─── GET DELIVERY DETAIL ────────────────────────────────────────────────────────

async function getDeliveryDetail(deliveryId, actor) {
  const { hospitalId } = actor;
  const delivery = await repo.findDeliveryById(deliveryId, hospitalId);
  if (!delivery) {
    const err = new Error('Delivery record not found.');
    err.statusCode = 404; err.code = 'DELIVERY_NOT_FOUND';
    throw err;
  }
  const [neonates, postpartumFollowups] = await Promise.all([
    repo.findNeonatesByDeliveryId(deliveryId),
    repo.findPostpartumByDeliveryId(deliveryId),
  ]);
  return { delivery, neonates, postpartum_followups: postpartumFollowups };
}

// ─── UPDATE DELIVERY ────────────────────────────────────────────────────────────

async function updateDelivery(deliveryId, updates, actor) {
  const { hospitalId, userId } = actor;

  let updated;
  await db.transaction(async (trx) => {
    const existing = await repo.findDeliveryById(deliveryId, hospitalId);
    if (!existing) {
      const err = new Error('Delivery record not found.');
      err.statusCode = 404; err.code = 'DELIVERY_NOT_FOUND';
      throw err;
    }
    updated = await repo.updateDelivery(deliveryId, hospitalId, updates, trx);
    if (!updated) {
      const err = new Error('No valid fields to update.');
      err.statusCode = 400; err.code = 'UPDATE_FAILED';
      throw err;
    }
  });

  await auditLog({
    hospitalId, userId,
    action: 'DELIVERY_UPDATED',
    entityType: 'delivery',
    entityId: deliveryId,
    meta: { updated_fields: Object.keys(updates) },
  });

  return updated;
}

// ─── LIST PATIENT DELIVERIES ────────────────────────────────────────────────────

async function listPatientDeliveries(patientId, queryOptions, actor) {
  const { hospitalId } = actor;
  const patient = await repo.findPatientInHospital(patientId, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found in this hospital.');
    err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND';
    throw err;
  }
  return repo.findDeliveriesByPatient(hospitalId, patientId, queryOptions);
}

// ─── LIST POSTPARTUM FOLLOWUPS ──────────────────────────────────────────────────

async function listPatientPostpartumFollowups(patientId, queryOptions, actor) {
  const { hospitalId } = actor;
  const patient = await repo.findPatientInHospital(patientId, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found in this hospital.');
    err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND';
    throw err;
  }
  return repo.findPostpartumFollowupsByPatient(patientId, queryOptions);
}

// ─── UPDATE POSTPARTUM FOLLOWUP ──────────────────────────────────────────────────

async function updatePostpartumFollowup(followupId, updates, actor) {
  const { hospitalId, userId } = actor;

  let updated;
  await db.transaction(async (trx) => {
    const existing = await repo.findPostpartumFollowupById(followupId, trx);
    if (!existing) {
      const err = new Error('Postpartum follow-up record not found.');
      err.statusCode = 404; err.code = 'FOLLOWUP_NOT_FOUND';
      throw err;
    }

    // Scope check: verify the delivery belongs to this hospital
    const delivery = await repo.findDeliveryById(existing.delivery_id, hospitalId);
    if (!delivery) {
      const err = new Error('Access denied. This follow-up does not belong to this hospital.');
      err.statusCode = 403; err.code = 'FOLLOWUP_ACCESS_DENIED';
      throw err;
    }

    // Invalid status transition guard
    if (existing.status === 'completed' && updates.status === 'scheduled') {
      const err = new Error('Cannot revert a completed follow-up to scheduled.');
      err.statusCode = 409; err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    updated = await repo.updatePostpartumFollowup(followupId, updates, trx);
    if (!updated) {
      const err = new Error('No valid fields to update.');
      err.statusCode = 400; err.code = 'UPDATE_FAILED';
      throw err;
    }
  });

  await auditLog({
    hospitalId, userId,
    action: 'POSTPARTUM_FOLLOWUP_UPDATED',
    entityType: 'postpartum_followup',
    entityId: followupId,
    meta: { updated_fields: Object.keys(updates), new_status: updates.status },
  });

  if (updates.status === 'completed') {
    dispatchEvent(EVENT_TYPES.POSTPARTUM_FOLLOWUP_DUE, {
      patientId: updated.patient_id,
      entityType: 'postpartum_followup',
      entityId: followupId,
      deliveryId: updated.delivery_id,
      visitType: updated.visit_type,
    }, hospitalId);
  }

  return updated;
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────────

async function getDeliveryAnalytics(hospitalId, { fromDate, toDate } = {}) {
  const [deliveriesThisMonth, breakdown] = await Promise.all([
    repo.countDeliveriesThisMonth(hospitalId),
    repo.deliveryTypeBreakdown(hospitalId, { fromDate, toDate }),
  ]);
  return { deliveries_this_month: deliveriesThisMonth, breakdown };
}

module.exports = {
  createDelivery,
  getDeliveryDetail,
  updateDelivery,
  listPatientDeliveries,
  listPatientPostpartumFollowups,
  updatePostpartumFollowup,
  getDeliveryAnalytics,
};