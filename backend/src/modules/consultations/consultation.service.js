'use strict';

const { db } = require('../../db/connection');
const consultationRepo = require('./consultation.repository');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES = require('../../events/event-types');
const { generateConsultationPdf } = require('../../utils/pdfGenerator.consultation');
const { uploadBufferToS3, generateDownloadUrl } = require('../../utils/s3-helper');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const logger = require('../../utils/logger');

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Compute BMI from weight and height.
 * Formula: weight_kg / (height_m)^2
 * Returns null if either value is missing.
 *
 * @param {number|null} weightKg
 * @param {number|null} heightCm
 * @returns {number|null}
 */
function computeBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * Derive current trimester from the pregnancy's LMP date.
 *  - Trimester 1: weeks 0–12
 *  - Trimester 2: weeks 13–26
 *  - Trimester 3: weeks 27+
 *
 * @param {Date} lmpDate
 * @returns {1|2|3|null}
 */
function deriveTrimester(lmpDate) {
  if (!lmpDate) return null;
  const today = new Date();
  const diffDays = Math.floor((today - new Date(lmpDate)) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  if (weeks <= 12) return 1;
  if (weeks <= 26) return 2;
  return 3;
}

/**
 * Merge incoming vitals with BMI computed server-side.
 *
 * @param {object|null} incomingVitals
 * @returns {object|null}
 */
function processVitals(incomingVitals) {
  if (!incomingVitals) return null;

  const processed = { ...incomingVitals };
  processed.bmi = computeBmi(processed.weight_kg, processed.height_cm);

  return processed;
}

/**
 * Merge incoming obstetric_obs with server-derived trimester.
 *
 * @param {object|null} incomingObs
 * @param {Date|null} lmpDate - From linked pregnancy record
 * @returns {object|null}
 */
function processObstetricObs(incomingObs, lmpDate) {
  if (!incomingObs) return null;

  const processed = { ...incomingObs };
  if (lmpDate) {
    processed.trimester = deriveTrimester(lmpDate);
  }
  return processed;
}

/**
 * Build the set of changed field records between current and incoming data
 * for override_logs. Handles scalar fields and JSONB objects independently.
 *
 * @param {object} existing - Current consultation row from DB
 * @param {object} incoming - Validated request body (excluding override_reason)
 * @returns {Array<{field, oldValue, newValue}>}
 */
function buildChangedFields(existing, incoming) {
  const TRACKABLE_SCALAR_FIELDS = [
    'symptoms',
    'diagnosis_notes',
    'high_risk_update',
    'treatment_plan',
    'doctor_notes',
    'report_reviewed',
    'referred_to',
    'milestone_impact',
    'consultation_outcome',
    'pregnancy_id',
  ];

  const TRACKABLE_JSONB_FIELDS = ['vitals', 'obstetric_obs', 'diagnosis_tags'];

  const changes = [];

  for (const field of TRACKABLE_SCALAR_FIELDS) {
    if (!(field in incoming)) continue;
    const oldVal = existing[field];
    const newVal = incoming[field];
    // Use loose equality comparison to detect actual change
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        oldValue: oldVal !== undefined && oldVal !== null ? String(oldVal) : null,
        newValue: newVal !== undefined && newVal !== null ? String(newVal) : null,
      });
    }
  }

  for (const field of TRACKABLE_JSONB_FIELDS) {
    if (!(field in incoming)) continue;
    const oldVal = existing[field];
    const newVal = incoming[field];
    const oldStr = oldVal ? JSON.stringify(oldVal) : null;
    const newStr = newVal ? JSON.stringify(newVal) : null;
    if (oldStr !== newStr) {
      changes.push({ field, oldValue: oldStr, newValue: newStr });
    }
  }

  return changes;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a new consultation linked to an appointment.
 *
 * Rules:
 * - Appointment must exist and belong to the hospital
 * - Appointment must not already have a consultation (1:1)
 * - BMI is auto-computed if vitals provided
 * - Trimester is derived if pregnancy_id and its LMP is available
 */
async function createConsultation(data, actor) {
  const { appointment_id, pregnancy_id, vitals, obstetric_obs, ...clinicalFields } = data;
  const { userId, hospitalId } = actor;

  // 1. Validate appointment exists and belongs to this hospital
  const appointment = await consultationRepo.findAppointmentById(appointment_id, hospitalId);
  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    err.code = 'APPOINTMENT_NOT_FOUND';
    throw err;
  }

  // 2. Ensure appointment is in a valid state for consultation creation
  // Acceptable states: checked_in, with_doctor
  const VALID_STATES = ['checked_in', 'with_doctor', 'arrived', 'waiting'];
  if (!VALID_STATES.includes(appointment.status)) {
    const err = new Error(
      `Appointment is in '${appointment.status}' status. Consultation can only be created for active appointments.`
    );
    err.statusCode = 409;
    err.code = 'APPOINTMENT_INVALID_STATE';
    throw err;
  }

  // 3. Check 1:1 constraint — no duplicate consultation for the same appointment
  const existing = await consultationRepo.findByAppointmentId(appointment_id, hospitalId);
  if (existing) {
    const err = new Error('A consultation already exists for this appointment.');
    err.statusCode = 409;
    err.code = 'CONSULTATION_ALREADY_EXISTS';
    throw err;
  }

  // 4. Process vitals (compute BMI)
  const processedVitals = processVitals(vitals);

  // 5. Process obstetric observations (derive trimester)
  let lmpDate = null;
  if (pregnancy_id) {
    const pregnancy = await consultationRepo.findPregnancyById(pregnancy_id, hospitalId);
    if (!pregnancy) {
      const err = new Error('Pregnancy record not found.');
      err.statusCode = 404;
      err.code = 'PREGNANCY_NOT_FOUND';
      throw err;
    }
    lmpDate = pregnancy.lmp_date;
  }
  const processedObsObs = processObstetricObs(obstetric_obs, lmpDate);

  // 6. Create the consultation
  const consultation = await consultationRepo.create({
    appointment_id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    hospital_id: hospitalId,
    pregnancy_id: pregnancy_id || null,
    vitals: processedVitals ? JSON.stringify(processedVitals) : null,
    obstetric_obs: processedObsObs ? JSON.stringify(processedObsObs) : null,
    ...clinicalFields,
    diagnosis_tags: clinicalFields.diagnosis_tags ? JSON.stringify(clinicalFields.diagnosis_tags) : null,
    is_finalized: false,
    finalized_at: null,
    finalized_by: null,
    created_by: userId,
  });

  // 7. Write audit log
  await auditLog({
    hospitalId,
    userId,
    action: 'CONSULTATION_CREATED',
    entityType: 'consultation',
    entityId: consultation.id,
    meta: { appointment_id, patient_id: appointment.patient_id },
  });

  logger.info(`Consultation created: ${consultation.id} for appointment ${appointment_id}`);
  return consultation;
}

/**
 * Get a single consultation by ID.
 * doctor_notes is only returned to doctor or admin roles.
 */
async function getConsultationById(id, actor) {
  const { hospitalId, role } = actor;

  const consultation = await consultationRepo.findById(id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  // Mask private doctor_notes from non-doctor roles
  if (role !== 'doctor' && role !== 'admin') {
    consultation.doctor_notes = undefined;
  }

  return consultation;
}

/**
 * Update a draft consultation.
 * Rejected outright if consultation is already finalized (use override instead).
 */
async function updateConsultation(id, data, actor) {
  const { userId, hospitalId } = actor;

  const consultation = await consultationRepo.findById(id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  if (consultation.is_finalized) {
    const err = new Error(
      'This consultation is finalised. Use the override endpoint to make changes with a documented reason.'
    );
    err.statusCode = 422;
    err.code = 'OVERRIDE_REASON_REQUIRED';
    throw err;
  }

  const { vitals, obstetric_obs, ...rest } = data;

  // Process vitals if provided
  const processedVitals = vitals !== undefined ? processVitals(vitals) : undefined;

  // Process obstetric_obs if provided — derive trimester from pregnancy if linked
  let processedObsObs;
  if (obstetric_obs !== undefined) {
    let lmpDate = null;
    const pregnancyId = rest.pregnancy_id || consultation.pregnancy_id;
    if (pregnancyId) {
      const pregnancy = await consultationRepo.findPregnancyById(pregnancyId, hospitalId);
      lmpDate = pregnancy?.lmp_date || null;
    }
    processedObsObs = processObstetricObs(obstetric_obs, lmpDate);
  }

  const updatePayload = { ...rest };
  if (processedVitals !== undefined) {
    updatePayload.vitals = processedVitals ? JSON.stringify(processedVitals) : null;
  }
  if (processedObsObs !== undefined) {
    updatePayload.obstetric_obs = processedObsObs ? JSON.stringify(processedObsObs) : null;
  }
  if ('diagnosis_tags' in rest) {
    updatePayload.diagnosis_tags = rest.diagnosis_tags ? JSON.stringify(rest.diagnosis_tags) : null;
  }

  const updated = await consultationRepo.update(id, hospitalId, updatePayload);

  await auditLog({
    hospitalId,
    userId,
    action: 'CONSULTATION_UPDATED',
    entityType: 'consultation',
    entityId: id,
    meta: { updated_fields: Object.keys(updatePayload) },
  });

  return updated;
}

/**
 * Finalize a consultation — sets is_finalized = true, marks appointment as completed,
 * and dispatches CONSULTATION_COMPLETED event.
 *
 * Once finalized:
 * - The consultation becomes read-only via PUT endpoint
 * - Only override endpoint can change fields (with reason + override_logs entry)
 */
async function finalizeConsultation(id, data, actor) {
  const { userId, hospitalId } = actor;

  const consultation = await consultationRepo.findById(id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  if (consultation.is_finalized) {
    const err = new Error('Consultation is already finalised.');
    err.statusCode = 409;
    err.code = 'CONSULTATION_ALREADY_FINALIZED';
    throw err;
  }

  const finalizedAt = new Date();

  // Run finalization and appointment update in one transaction
  const updated = await db.transaction(async (trx) => {
    const result = await consultationRepo.update(
      id,
      hospitalId,
      {
        is_finalized: true,
        finalized_at: finalizedAt,
        finalized_by: userId,
        consultation_outcome: data.consultation_outcome,
      },
      trx
    );

    // Per architecture: appointment status → completed on consultation finalise
    await consultationRepo.markAppointmentCompleted(consultation.appointment_id, hospitalId, trx);

    return result;
  });

  // Audit log
  await auditLog({
    hospitalId,
    userId,
    action: 'CONSULTATION_FINALIZED',
    entityType: 'consultation',
    entityId: id,
    meta: {
      finalized_at: finalizedAt.toISOString(),
      consultation_outcome: data.consultation_outcome,
    },
  });

  // ── Phase 6 Batch 5: Fetch patient, doctor, hospital for automation payloads ──
  // Both CONSULTATION_COMPLETED and FEEDBACK_REQUESTED require these template fields.
  // Fetch is fire-and-forget context — failures are caught and logged, never thrown.
  let patientName   = '';
  let patientPhone  = '';
  let doctorName    = '';
  let hospitalName  = '';
  let hospitalPhone = '';

  try {
    const [patientRow, doctorRow, hospitalRow] = await Promise.all([
      db('patients').where('id', consultation.patient_id).first('name', 'phone', 'whatsapp_number'),
      db('doctors')
        .join('users', 'doctors.user_id', 'users.id')
        .where('doctors.id', consultation.doctor_id)
        .first('users.name as doctor_name'),
      db('hospitals').where('id', hospitalId).first('name', 'phone'),
    ]);

    patientName   = patientRow  ? patientRow.name                                       : '';
    patientPhone  = patientRow  ? (patientRow.whatsapp_number || patientRow.phone || '') : '';
    doctorName    = doctorRow   ? doctorRow.doctor_name                                 : '';
    hospitalName  = hospitalRow ? hospitalRow.name                                      : '';
    hospitalPhone = hospitalRow ? (hospitalRow.phone || '')                             : '';
  } catch (fetchErr) {
    logger.warn(`[consultation.service] Failed to fetch names for finalizeConsultation dispatch: ${fetchErr.message}`);
  }

  // Dispatch CONSULTATION_COMPLETED event to N8N (fire-and-forget, non-blocking).
  // Payload includes patient/doctor/hospital names for downstream N8N template rendering.
  dispatchEvent(
    EVENT_TYPES.CONSULTATION_COMPLETED,
    {
      patientId:            consultation.patient_id,
      entityType:           'consultation',
      entityId:             id,
      actorUserId:          userId,
      // Event data
      consultationId:       id,
      appointmentId:        consultation.appointment_id,
      doctorId:             consultation.doctor_id,
      consultationOutcome:  data.consultation_outcome,
      finalizedAt:          finalizedAt.toISOString(),
      // Template variables
      patientName,
      patientPhone,
      doctorName,
      hospitalName,
      hospitalPhone,
    },
    hospitalId
  ).catch((err) => {
    logger.error(`[consultation.service] CONSULTATION_COMPLETED dispatch error for ${id}: ${err.message}`);
  });

  // ── Phase 6 Batch 5: Dispatch FEEDBACK_REQUESTED ──────────────────────────
  // Architecture Workflow 9: After consultation is completed, N8N sends a
  // feedback collection WhatsApp message to the patient.
  // Fires only at finalization — never on draft/update actions.
  // Template: feedback_collection — requires patientName, doctorName.
  dispatchEvent(
    EVENT_TYPES.FEEDBACK_REQUESTED,
    {
      patientId:       consultation.patient_id,
      entityType:      'consultation',
      entityId:        id,
      actorUserId:     userId,
      // Template variables (arch Workflow 9 + template-map: feedback_collection)
      patientName,
      patientPhone,
      doctorName,
      hospitalName,
      hospitalPhone,
      consultationId:  id,
      appointmentId:   consultation.appointment_id,
      finalizedAt:     finalizedAt.toISOString(),
    },
    hospitalId
  ).catch((err) => {
    logger.error(`[consultation.service] FEEDBACK_REQUESTED dispatch error for ${id}: ${err.message}`);
  });

  logger.info(`Consultation finalised: ${id}`);
  return updated;
}

/**
 * Override a finalised consultation.
 *
 * Rules:
 * - override_reason is mandatory (validated by Joi before this service is called)
 * - Each changed field produces one row in override_logs
 * - All changes + override_logs inserts execute in a single transaction
 * - activity_logs entry is written
 */
async function overrideConsultation(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { override_reason, vitals, obstetric_obs, ...clinicalFields } = data;

  const consultation = await consultationRepo.findById(id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  if (!consultation.is_finalized) {
    const err = new Error(
      'Only finalised consultations can be overridden. Use the update endpoint for draft consultations.'
    );
    err.statusCode = 422;
    err.code = 'CONSULTATION_NOT_FINALIZED';
    throw err;
  }

  // Process vitals & obstetric obs
  const processedVitals = vitals !== undefined ? processVitals(vitals) : undefined;

  let processedObsObs;
  if (obstetric_obs !== undefined) {
    let lmpDate = null;
    const pregnancyId = clinicalFields.pregnancy_id || consultation.pregnancy_id;
    if (pregnancyId) {
      const pregnancy = await consultationRepo.findPregnancyById(pregnancyId, hospitalId);
      lmpDate = pregnancy?.lmp_date || null;
    }
    processedObsObs = processObstetricObs(obstetric_obs, lmpDate);
  }

  // Build update payload
  const updatePayload = { ...clinicalFields };
  if (processedVitals !== undefined) {
    updatePayload.vitals = processedVitals ? JSON.stringify(processedVitals) : null;
  }
  if (processedObsObs !== undefined) {
    updatePayload.obstetric_obs = processedObsObs ? JSON.stringify(processedObsObs) : null;
  }
  if ('diagnosis_tags' in clinicalFields) {
    updatePayload.diagnosis_tags = clinicalFields.diagnosis_tags
      ? JSON.stringify(clinicalFields.diagnosis_tags)
      : null;
  }

  // Build the reconstructed incoming object (with processed JSONB) to compare for change detection
  const incomingForDiff = {
    ...clinicalFields,
    ...(processedVitals !== undefined && { vitals: processedVitals }),
    ...(processedObsObs !== undefined && { obstetric_obs: processedObsObs }),
  };

  // Detect changed fields for override_logs
  const changedFields = buildChangedFields(consultation, incomingForDiff);

  if (changedFields.length === 0) {
    const err = new Error('No fields were changed. Override not recorded.');
    err.statusCode = 422;
    err.code = 'NO_CHANGES_DETECTED';
    throw err;
  }

  // Execute update + override_logs inserts atomically
  const updated = await db.transaction(async (trx) => {
    const result = await consultationRepo.update(id, hospitalId, updatePayload, trx);

    for (const change of changedFields) {
      await consultationRepo.insertOverrideLog(
        {
          hospitalId,
          userId,
          entityType: 'consultation',
          entityId: id,
          fieldChanged: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          overrideReason: override_reason,
          overrideNote: null,
        },
        trx
      );
    }

    return result;
  });

  // Audit log — records override action and count of changed fields
  await auditLog({
    hospitalId,
    userId,
    action: 'CONSULTATION_OVERRIDDEN',
    entityType: 'consultation',
    entityId: id,
    meta: {
      override_reason,
      fields_changed: changedFields.map((c) => c.field),
    },
  });

  logger.info(
    `Consultation override applied: ${id} — ${changedFields.length} field(s) changed by user ${userId}`
  );

  return { consultation: updated, changed_fields: changedFields.map((c) => c.field) };
}

/**
 * Generate a consultation summary PDF, upload to S3, and return a presigned
 * download URL. The PDF key is stored on the consultation record for future access.
 */
async function getConsultationPdf(id, actor) {
  const { hospitalId } = actor;

  const consultation = await consultationRepo.findById(id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  // Fetch linked patient and doctor info for the PDF header
  const [patient, doctor] = await Promise.all([
    db('patients').where({ id: consultation.patient_id }).first(),
    db('doctors')
      .join('users', 'doctors.user_id', 'users.id')
      .where('doctors.id', consultation.doctor_id)
      .select('doctors.*', 'users.name as doctor_name')
      .first(),
  ]);

  const hospital = await db('hospitals').where({ id: hospitalId }).first();

  // Generate the PDF buffer
  const pdfBuffer = await generateConsultationPdf({
    consultation,
    patient,
    doctor,
    hospital,
  });

  // Define S3 key
  const s3Key = `consultations/${hospitalId}/${consultation.patient_id}/${id}/consultation_summary.pdf`;

  // Upload to S3
  await uploadBufferToS3(s3Key, pdfBuffer, 'application/pdf');

  // Generate presigned download URL (30-minute TTL per architecture)
  const { downloadUrl: presignedUrl } = await generateDownloadUrl(s3Key, hospitalId, id, actor.userId, 'consultations', 'consultation');

  // Log access
  await auditLog({
    hospitalId,
    userId: actor.userId,
    action: 'CONSULTATION_PDF_ACCESSED',
    entityType: 'consultation',
    entityId: id,
    meta: { s3_key: s3Key },
  });

  return { url: presignedUrl, expires_in_seconds: 1800 };
}

/**
 * Return paginated consultation list for a patient.
 */
async function listPatientConsultations(patientId, queryParams, actor) {
  const { hospitalId } = actor;
  const { page, limit, sort_by: sortBy, sort_dir: sortDir, is_finalized: isFinalized } = queryParams;

  // Verify patient belongs to hospital
  const patient = await db('patients').where({ id: patientId, hospital_id: hospitalId }).first();
  if (!patient) {
    const err = new Error('Patient not found.');
    err.statusCode = 404;
    err.code = 'PATIENT_NOT_FOUND';
    throw err;
  }

  return consultationRepo.findAllByPatient(patientId, hospitalId, {
    page,
    limit,
    sortBy,
    sortDir,
    isFinalized,
  });
}

module.exports = {
  createConsultation,
  getConsultationById,
  updateConsultation,
  finalizeConsultation,
  overrideConsultation,
  getConsultationPdf,
  listPatientConsultations,
};