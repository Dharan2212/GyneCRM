'use strict';

const { db }            = require('../../db/connection');
const pregnancyRepo     = require('./pregnancy.repository');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES       = require('../../events/event-types');
const { auditLog }      = require('../../middleware/audit-logger.middleware');
const logger            = require('../../utils/logger');
const { PREGNANCY_STATUS } = require('../../validators/pregnancy.validator');

/**
 * PREGNANCY SERVICE
 *
 * Phase 6 Batch 3 fixes applied:
 *  - _checkAndDispatchMilestone: uses week_number (not milestone_week), adds
 *    patient_name, patientPhone, hospitalName, doctorName to payload
 *  - toggleHighRisk: fetches patient + hospital + doctor and includes them
 *    in PREGNANCY_HIGH_RISK_FLAGGED dispatch payload
 *  - getMilestones: uses week_number, milestone_name; uses protocol.name
 *  - recalculateActivePregnancyWeeks: uses lmp_date (not lmp)
 */

// ─── Calculation helpers ──────────────────────────────────────────────────────

function computePregnancyWeek(lmp) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lmpDate = new Date(lmp);
  lmpDate.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - lmpDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
}

function computeEdd(lmp) {
  const lmpDate = new Date(lmp);
  const edd     = new Date(lmpDate);
  edd.setUTCDate(edd.getUTCDate() + 280);
  return edd;
}

function deriveTrimester(week) {
  if (week <= 12) return 'first';
  if (week <= 27) return 'second';
  return 'third';
}

async function assertPregnancyExists(id, hospitalId) {
  const pregnancy = await pregnancyRepo.findById(id, hospitalId);
  if (!pregnancy) {
    const err = new Error('Pregnancy record not found.');
    err.statusCode = 404;
    err.code = 'PREGNANCY_NOT_FOUND';
    throw err;
  }
  return pregnancy;
}

function assertActiveStatus(pregnancy) {
  if (pregnancy.status !== PREGNANCY_STATUS.ACTIVE) {
    const err = new Error(
      `Pregnancy is already closed with status '${pregnancy.status}'. This action requires an active pregnancy.`
    );
    err.statusCode = 422;
    err.code = 'PREGNANCY_ALREADY_CLOSED';
    throw err;
  }
}

/**
 * Fetch hospital name and phone for automation payloads.
 * Never throws — returns empty strings on failure.
 */
async function fetchHospitalInfo(hospitalId) {
  try {
    const hospital = await db('hospitals').where('id', hospitalId).select('name', 'phone').first();
    return {
      hospitalName:  hospital ? hospital.name  : '',
      hospitalPhone: hospital ? hospital.phone : '',
    };
  } catch (err) {
    logger.warn('[pregnancy.service] fetchHospitalInfo failed', { hospitalId, error: err.message });
    return { hospitalName: '', hospitalPhone: '' };
  }
}

// ─── Service methods ──────────────────────────────────────────────────────────

async function createPregnancy(data, actor) {
  const { patient_id, doctor_id, lmp, gravida, para, notes } = data;
  const { userId, hospitalId } = actor;

  const patient = await pregnancyRepo.findPatientById(patient_id, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  const doctor = await pregnancyRepo.findDoctorById(doctor_id, hospitalId);
  if (!doctor) {
    const err = new Error('Doctor not found.'); err.statusCode = 404; err.code = 'DOCTOR_NOT_FOUND'; throw err;
  }

  const lmpDate = new Date(lmp);
  if (lmpDate > new Date()) {
    const err = new Error('LMP date cannot be in the future.'); err.statusCode = 422; err.code = 'INVALID_LMP_DATE'; throw err;
  }

  const pregnancyWeek = computePregnancyWeek(lmpDate);
  const edd           = computeEdd(lmpDate);
  const trimester     = deriveTrimester(pregnancyWeek);

  // pregnancies migration 016: column is 'lmp_date'
  const pregnancy = await pregnancyRepo.create({
    patient_id,
    hospital_id:      hospitalId,
    doctor_id,
    lmp_date:         lmpDate,   // correct column name per migration 016
    edd,
    pregnancy_week:   pregnancyWeek,
    gravida,
    para,
    is_high_risk:     false,
    high_risk_reason: null,
    status:           PREGNANCY_STATUS.ACTIVE,
    notes:            notes || null,
    delivery_date:    null,
  });

  await auditLog({
    hospitalId,
    userId,
    action:     'PREGNANCY_CREATED',
    entityType: 'pregnancy',
    entityId:   pregnancy.id,
    meta: {
      patient_id,
      lmp:            lmpDate.toISOString().split('T')[0],
      edd:            edd.toISOString().split('T')[0],
      pregnancy_week: pregnancyWeek,
      trimester,
      gravida,
      para,
    },
  });

  logger.info(`Pregnancy created: ${pregnancy.id} for patient ${patient_id}, week ${pregnancyWeek}`);
  return _enrichPregnancy(pregnancy);
}

async function getPregnancyById(id, actor) {
  const { hospitalId } = actor;

  const pregnancy = await pregnancyRepo.findByIdWithDetails(id, hospitalId);
  if (!pregnancy) {
    const err = new Error('Pregnancy record not found.'); err.statusCode = 404; err.code = 'PREGNANCY_NOT_FOUND'; throw err;
  }

  const enriched           = _enrichPregnancy(pregnancy);
  enriched.risk_history    = await pregnancyRepo.findOverrideLogsByPregnancy(id, hospitalId);
  enriched.antenatal_visits = await pregnancyRepo.findConsultationsByPregnancy(id, hospitalId);

  return enriched;
}

async function updatePregnancy(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { lmp, gravida, para, notes, doctor_id, edd_override, edd_override_reason, edd_override_scan_date } = data;

  const pregnancy = await assertPregnancyExists(id, hospitalId);

  if (doctor_id) {
    const doctor = await pregnancyRepo.findDoctorById(doctor_id, hospitalId);
    if (!doctor) {
      const err = new Error('Doctor not found.'); err.statusCode = 404; err.code = 'DOCTOR_NOT_FOUND'; throw err;
    }
  }

  const updatePayload = {};

  if (lmp !== undefined) {
    const lmpDate = new Date(lmp);
    if (lmpDate > new Date()) {
      const err = new Error('LMP date cannot be in the future.'); err.statusCode = 422; err.code = 'INVALID_LMP_DATE'; throw err;
    }
    updatePayload.lmp_date        = lmpDate;   // correct column name
    updatePayload.pregnancy_week  = computePregnancyWeek(lmpDate);
    updatePayload.edd             = computeEdd(lmpDate);
  }

  if (edd_override !== undefined) {
    const oldEdd = pregnancy.edd;
    const newEdd = new Date(edd_override);

    await db.transaction(async (trx) => {
      await pregnancyRepo.update(id, hospitalId, { edd: newEdd }, trx);
      await pregnancyRepo.insertOverrideLog(
        {
          hospitalId,
          userId,
          entityType:    'pregnancy',
          entityId:      id,
          fieldChanged:  'edd',
          oldValue:      oldEdd ? new Date(oldEdd).toISOString().split('T')[0] : null,
          newValue:      newEdd.toISOString().split('T')[0],
          overrideReason: edd_override_reason,
          overrideNote:  `Scan date: ${new Date(edd_override_scan_date).toISOString().split('T')[0]}`,
        },
        trx,
      );
    });

    await auditLog({
      hospitalId, userId, action: 'PREGNANCY_UPDATED', entityType: 'pregnancy', entityId: id,
      meta: { action: 'edd_override', old_edd: oldEdd, new_edd: newEdd.toISOString().split('T')[0],
              scan_date: edd_override_scan_date, reason: edd_override_reason },
    });

    if (!lmp && !gravida && !para && !notes && !doctor_id) {
      const updated = await pregnancyRepo.findByIdWithDetails(id, hospitalId);
      return _enrichPregnancy(updated);
    }
  }

  if (gravida    !== undefined) updatePayload.gravida   = gravida;
  if (para       !== undefined) updatePayload.para      = para;
  if (notes      !== undefined) updatePayload.notes     = notes;
  if (doctor_id  !== undefined) updatePayload.doctor_id = doctor_id;

  if (Object.keys(updatePayload).length > 0) {
    await pregnancyRepo.update(id, hospitalId, updatePayload);
  }

  await auditLog({
    hospitalId, userId, action: 'PREGNANCY_UPDATED', entityType: 'pregnancy', entityId: id,
    meta: { updated_fields: Object.keys(updatePayload) },
  });

  const updated = await pregnancyRepo.findByIdWithDetails(id, hospitalId);
  return _enrichPregnancy(updated);
}

/**
 * Toggle high-risk flag on a pregnancy.
 *
 * Phase 6 Batch 3: Dispatch payload now includes patient_name, patientPhone,
 * doctorName, hospitalName — required for the high-risk WhatsApp template.
 */
async function toggleHighRisk(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { is_high_risk, high_risk_reason, override_note } = data;

  const pregnancy = await assertPregnancyExists(id, hospitalId);
  assertActiveStatus(pregnancy);

  const oldValue = pregnancy.is_high_risk;

  if (oldValue === is_high_risk) {
    const err = new Error(
      `Pregnancy is already ${is_high_risk ? 'flagged as high-risk' : 'not high-risk'}. No change needed.`
    );
    err.statusCode = 422;
    err.code = 'PREGNANCY_HIGH_RISK_NO_CHANGE';
    throw err;
  }

  const updated = await db.transaction(async (trx) => {
    const result = await pregnancyRepo.update(
      id, hospitalId,
      { is_high_risk, high_risk_reason: is_high_risk ? high_risk_reason : null },
      trx,
    );

    await pregnancyRepo.insertOverrideLog(
      {
        hospitalId, userId, entityType: 'pregnancy', entityId: id,
        fieldChanged:  'is_high_risk',
        oldValue:      String(oldValue),
        newValue:      String(is_high_risk),
        overrideReason: high_risk_reason,
        overrideNote:  override_note || null,
      },
      trx,
    );

    return result;
  });

  await auditLog({
    hospitalId, userId, action: 'PREGNANCY_HIGH_RISK_UPDATED', entityType: 'pregnancy', entityId: id,
    meta: { old_value: oldValue, new_value: is_high_risk, reason: high_risk_reason },
  });

  // Dispatch PREGNANCY_HIGH_RISK_FLAGGED only when setting to true
  if (is_high_risk) {
    // Fetch patient, doctor, hospital info for complete template payload
    const [patient, doctorRow, { hospitalName, hospitalPhone }] = await Promise.all([
      db('patients').where('id', pregnancy.patient_id).first('name', 'phone', 'whatsapp_number'),
      db('doctors').where('id', pregnancy.doctor_id)
        .join('users', 'doctors.user_id', 'users.id')
        .first('users.name as doctor_name'),
      fetchHospitalInfo(hospitalId),
    ]);

    dispatchEvent(
      EVENT_TYPES.PREGNANCY_HIGH_RISK_FLAGGED,
      {
        patientId:       pregnancy.patient_id,
        entityType:      'pregnancy',
        entityId:        id,
        actorUserId:     userId,
        // Template variables (arch template: pregnancy_high_risk_alert)
        patientName:     patient ? patient.name : '',
        patientPhone:    patient ? (patient.whatsapp_number || patient.phone) : '',
        doctorName:      doctorRow ? doctorRow.doctor_name : '',
        pregnancyWeek:   pregnancy.pregnancy_week,
        highRiskReason:  high_risk_reason,
        hospitalName,
        hospitalPhone,
        flaggedAt:       new Date().toISOString(),
      },
      hospitalId,
    ).catch((err) => {
      logger.error(`Failed to dispatch PREGNANCY_HIGH_RISK_FLAGGED for ${id}: ${err.message}`);
    });
  }

  logger.info(`Pregnancy high-risk toggled: ${id} → is_high_risk=${is_high_risk} by user ${userId}`);
  return _enrichPregnancy(updated);
}

async function closePregnancy(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { status, closure_reason, closure_date, notes } = data;

  const pregnancy = await assertPregnancyExists(id, hospitalId);
  assertActiveStatus(pregnancy);

  const closedAt = new Date(closure_date);

  const updatePayload = {
    status,
    notes:          notes !== undefined ? notes : pregnancy.notes,
    closed_at:      closedAt,
    closed_by:      userId,
    close_reason:   closure_reason,   // migration 016 uses close_reason (not closure_reason)
  };

  if (status === PREGNANCY_STATUS.DELIVERED) {
    updatePayload.delivery_date = closedAt;
  }

  const updated = await pregnancyRepo.update(id, hospitalId, updatePayload);

  await auditLog({
    hospitalId, userId, action: 'PREGNANCY_CLOSED', entityType: 'pregnancy', entityId: id,
    meta: { status, closure_reason, closure_date: closedAt.toISOString().split('T')[0] },
  });

  logger.info(`Pregnancy closed: ${id} → status=${status} by user ${userId}`);
  return _enrichPregnancy(updated);
}

async function listPatientPregnancies(patientId, queryParams, actor) {
  const { hospitalId } = actor;

  const patient = await pregnancyRepo.findPatientById(patientId, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  const { page, limit, sort_by: sortBy, sort_dir: sortDir, status } = queryParams;
  return pregnancyRepo.findAllByPatient(patientId, hospitalId, { page, limit, sortBy, sortDir, status });
}

/**
 * Get milestone progress for a pregnancy.
 *
 * Phase 6 Batch 3 fixes:
 *   - Uses week_number (not milestone_week) — actual column in migration 038
 *   - Uses milestone_name (not milestone_label)
 *   - Uses protocol.name (not protocol.protocol_name) — migration 037
 *   - findMilestonesByProtocol no longer passes hospitalId (not a column)
 */
async function getMilestones(id, actor) {
  const { hospitalId } = actor;

  const pregnancy   = await assertPregnancyExists(id, hospitalId);
  const currentWeek = pregnancy.pregnancy_week || computePregnancyWeek(pregnancy.lmp_date);
  const trimester   = deriveTrimester(currentWeek);

  const protocol = await pregnancyRepo.findActiveProtocol(hospitalId);

  if (!protocol) {
    return {
      pregnancy_id:   id,
      pregnancy_week: currentWeek,
      trimester,
      edd:            pregnancy.edd,
      protocol:       null,
      milestones:     [],
      notice: 'No active clinical protocol configured for this hospital. Contact your administrator.',
    };
  }

  // findMilestonesByProtocol now only takes protocolId (no hospitalId — table has no hospital_id)
  const milestones = await pregnancyRepo.findMilestonesByProtocol(protocol.id);

  const milestoneProgress = milestones.map((m) => {
    let status;
    // week_number is the correct column (arch doc + migration 038)
    if (m.week_number < currentWeek)      status = 'completed';
    else if (m.week_number === currentWeek) status = 'current';
    else                                   status = 'upcoming';

    const weeksUntil = m.week_number - currentWeek;

    return {
      id:               m.id,
      milestone_week:   m.week_number,         // normalise to milestone_week for API consistency
      milestone_label:  m.milestone_name,      // map milestone_name → milestone_label for API
      description:      m.description,
      is_critical:      m.is_critical,
      status,
      weeks_until:  status === 'upcoming'   ? weeksUntil       : null,
      weeks_since:  status === 'completed'  ? Math.abs(weeksUntil) : null,
    };
  });

  return {
    pregnancy_id:   id,
    pregnancy_week: currentWeek,
    trimester,
    edd:            pregnancy.edd,
    is_high_risk:   pregnancy.is_high_risk,
    protocol: {
      id:   protocol.id,
      name: protocol.name,          // migration 037: column is 'name'
      type: protocol.protocol_type,
    },
    milestones: milestoneProgress,
    summary: {
      total:     milestoneProgress.length,
      completed: milestoneProgress.filter((m) => m.status === 'completed').length,
      current:   milestoneProgress.filter((m) => m.status === 'current').length,
      upcoming:  milestoneProgress.filter((m) => m.status === 'upcoming').length,
    },
  };
}

// ─── Cron-compatible exports ──────────────────────────────────────────────────

/**
 * Recalculate pregnancy_week for all active pregnancies globally.
 * Called by: src/jobs/pregnancyWeekJob.js
 *
 * Phase 6 Batch 3 fix: uses lmp_date (not lmp) — actual column in migration 016.
 * The pregnancy rows returned by findAllActiveGlobally now include patient_name,
 * patient_phone, hospital_name, doctor_name for dispatch payloads.
 */
async function recalculateActivePregnancyWeeks() {
  const activePregnancies = await pregnancyRepo.findAllActiveGlobally();
  let updated = 0;

  for (const pregnancy of activePregnancies) {
    if (!pregnancy.lmp_date) continue;   // guard — use lmp_date per migration 016

    const newWeek = computePregnancyWeek(pregnancy.lmp_date);

    if (newWeek !== pregnancy.pregnancy_week) {
      await pregnancyRepo.update(pregnancy.id, pregnancy.hospital_id, {
        pregnancy_week: newWeek,
      });
      updated++;

      await _checkAndDispatchMilestone(pregnancy, newWeek);
    }
  }

  logger.info(`[pregnancyWeekJob] Recalculated ${activePregnancies.length} active pregnancies. Updated: ${updated}`);
  return { processed: activePregnancies.length, updated };
}

/**
 * Check if new pregnancy week matches a protocol milestone and dispatch event.
 *
 * Phase 6 Batch 3 fixes:
 *   - Uses week_number (not milestone_week) — migration 038 column
 *   - Uses milestone_name (not milestone_label)
 *   - Payload includes patient_name, patientPhone, hospitalName, doctorName
 *   - findMilestonesByProtocol called without hospitalId
 *
 * @param {object} pregnancy  — enriched row from findAllActiveGlobally
 * @param {number} newWeek
 */
async function _checkAndDispatchMilestone(pregnancy, newWeek) {
  try {
    const protocol = await pregnancyRepo.findActiveProtocol(pregnancy.hospital_id);
    if (!protocol) return;

    const milestones = await pregnancyRepo.findMilestonesByProtocol(protocol.id);

    // week_number is the correct column name
    const matchedMilestone = milestones.find((m) => m.week_number === newWeek);
    if (!matchedMilestone) return;

    dispatchEvent(
      EVENT_TYPES.PREGNANCY_MILESTONE_REACHED,
      {
        patientId:            pregnancy.patient_id,
        entityType:           'pregnancy',
        entityId:             pregnancy.id,
        branchId:             null,
        actorUserId:          null,
        // Template variables (arch Workflow 5)
        patientName:          pregnancy.patient_name,
        patientPhone:         pregnancy.patient_whatsapp || pregnancy.patient_phone,
        doctorName:           pregnancy.doctor_name || '',
        pregnancyWeek:        newWeek,
        trimester:            deriveTrimester(newWeek),
        milestoneId:          matchedMilestone.id,
        milestoneName:        matchedMilestone.milestone_name,
        milestoneWeek:        matchedMilestone.week_number,
        milestoneDescription: matchedMilestone.description || '',
        hospitalName:         pregnancy.hospital_name,
        hospitalPhone:        pregnancy.hospital_phone || '',
      },
      pregnancy.hospital_id,
    ).catch((err) => {
      logger.error(
        `Failed to dispatch PREGNANCY_MILESTONE_REACHED for pregnancy ${pregnancy.id} week ${newWeek}: ${err.message}`
      );
    });

    logger.info(
      `Milestone reached: pregnancy=${pregnancy.id} week=${newWeek} milestone="${matchedMilestone.milestone_name}"`
    );
  } catch (err) {
    logger.error(`Milestone check failed for pregnancy ${pregnancy.id}: ${err.message}`);
  }
}

// ─── Private enrichment helper ────────────────────────────────────────────────

function _enrichPregnancy(pregnancy) {
  if (!pregnancy) return null;
  // Use lmp_date (actual column) — fall back to lmp if old rows exist
  const lmpSource = pregnancy.lmp_date || pregnancy.lmp;
  const week = pregnancy.pregnancy_week != null
    ? pregnancy.pregnancy_week
    : (lmpSource ? computePregnancyWeek(lmpSource) : 0);

  return {
    ...pregnancy,
    trimester:      deriveTrimester(week),
    pregnancy_week: week,
    edd_formatted:  pregnancy.edd ? new Date(pregnancy.edd).toISOString().split('T')[0] : null,
    lmp_formatted:  lmpSource     ? new Date(lmpSource).toISOString().split('T')[0]     : null,
  };
}

module.exports = {
  createPregnancy,
  getPregnancyById,
  updatePregnancy,
  toggleHighRisk,
  closePregnancy,
  listPatientPregnancies,
  getMilestones,
  recalculateActivePregnancyWeeks,
  computePregnancyWeek,
  computeEdd,
  deriveTrimester,
};
