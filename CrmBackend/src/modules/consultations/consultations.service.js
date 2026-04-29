const mongoose = require('mongoose');
const Consultation = require('../../models/Consultation');
const FollowUp = require('../../models/FollowUp');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const { resolveHospitalId } = require('../appointments/appointments.query');
const { getConsultationDetailQuery, EDITABLE_FIELDS } = require('./consultations.query');
const { buildWorkspacePayload } = require('./consultations.workspace');
const { buildConsultationPdfPayload } = require('./consultations.pdf');
const {
  buildFollowUpFilter,
  getFollowUpDetailQuery,
  normalizePagination,
} = require('./consultations.followup.query');

const STATUS_TRANSITIONS = {
  draft: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: [],
  finalised: [],
};

const FOLLOW_UP_TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'missed']);

function normalizeNullableString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDiagnosis(value) {
  if (!value) {
    return value;
  }

  const output = { ...value };

  if (Array.isArray(output.secondary)) {
    output.secondary = output.secondary
      .map((item) => normalizeNullableString(item))
      .filter(Boolean);
  }

  return output;
}

function normalizeFollowUpFields(payload = {}) {
  const output = { ...payload };

  if (
    Object.prototype.hasOwnProperty.call(output, 'follow_up_required') &&
    output.follow_up_required === false
  ) {
    output.follow_up_date = null;
  }

  if (Object.prototype.hasOwnProperty.call(output, 'follow_up_reason')) {
    output.follow_up_reason = normalizeNullableString(output.follow_up_reason);
  }

  if (Object.prototype.hasOwnProperty.call(output, 'follow_up_notes')) {
    output.follow_up_notes = normalizeNullableString(output.follow_up_notes);
  }

  return output;
}

function normalizeConsultationPayload(payload = {}) {
  const output = { ...payload };

  [
    'chief_complaint',
    'history_of_present_illness',
    'provisional_diagnosis',
    'advice',
    'notes',
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(output, field)) {
      output[field] = normalizeNullableString(output[field]);
    }
  });

  if (output.examination) {
    output.examination = { ...output.examination };
    Object.keys(output.examination).forEach((field) => {
      output.examination[field] = normalizeNullableString(output.examination[field]);
    });
  }

  if (output.diagnosis) {
    output.diagnosis = normalizeDiagnosis(output.diagnosis);
    if (Object.prototype.hasOwnProperty.call(output.diagnosis, 'primary')) {
      output.diagnosis.primary = normalizeNullableString(output.diagnosis.primary);
    }
    if (Object.prototype.hasOwnProperty.call(output.diagnosis, 'notes')) {
      output.diagnosis.notes = normalizeNullableString(output.diagnosis.notes);
    }
  }

  return normalizeFollowUpFields(output);
}

function summarizeFollowUp(followUp) {
  if (!followUp) {
    return null;
  }

  return {
    _id: followUp._id,
    due_date: followUp.due_date,
    status: followUp.status,
    priority: followUp.priority,
    notes: followUp.notes || null,
  };
}

async function ensureScopedReference(Model, id, hospitalId, label) {
  assertObjectId(id, label);

  const filter = {
    _id: id,
    hospital_id: hospitalId,
  };

  if (Model === Patient) {
    filter.is_deleted = false;
  }

  const record = await Model.findOne(filter)
    .select('_id hospital_id patient_id doctor_id')
    .lean();

  if (!record) {
    throw new AppError(`${label} not found.`, HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

async function getScopedConsultation(id, hospitalId, session = null) {
  assertObjectId(id, 'consultation id');

  const consultation = await Consultation.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).session(session);

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  return consultation;
}

async function attachFollowUpSummaryToConsultation(consultation, hospitalId) {
  if (!consultation) {
    return consultation;
  }

  const followUp = await FollowUp.findOne({
    consultation_id: consultation._id,
    hospital_id: hospitalId,
  })
    .sort({ is_active: -1, due_date: 1, createdAt: -1 })
    .select('_id due_date status priority notes')
    .lean();

  return {
    ...consultation,
    follow_up_summary: summarizeFollowUp(followUp),
  };
}

async function getConsultationDetailById(id, hospitalId) {
  const consultation = await getConsultationDetailQuery({
    _id: id,
    hospital_id: hospitalId,
  }).lean();

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  return attachFollowUpSummaryToConsultation(consultation, hospitalId);
}

async function getFollowUpDetailById(id, hospitalId) {
  assertObjectId(id, 'follow-up id');

  const followUp = await getFollowUpDetailQuery({
    _id: id,
    hospital_id: hospitalId,
  }).lean();

  if (!followUp) {
    throw new AppError('Follow-up not found.', HTTP_STATUS.NOT_FOUND);
  }

  return followUp;
}

function resolveFollowUpRequiredState(consultation, payload = {}) {
  if (Object.prototype.hasOwnProperty.call(payload, 'follow_up_required')) {
    return payload.follow_up_required;
  }

  return consultation.follow_up_required;
}

function resolveFollowUpDateState(consultation, payload = {}) {
  if (Object.prototype.hasOwnProperty.call(payload, 'follow_up_date')) {
    return payload.follow_up_date;
  }

  return consultation.follow_up_date;
}

async function createOrUpdateLinkedFollowUp(consultation, payload, actorId, session) {
  const dueDate = resolveFollowUpDateState(consultation, payload);
  const followUpRequired = resolveFollowUpRequiredState(consultation, payload);

  if (!followUpRequired) {
    return null;
  }

  if (!dueDate) {
    throw new AppError(
      'follow_up_date is required when follow_up_required is true.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const reason =
    normalizeNullableString(payload.follow_up_reason) ||
    normalizeNullableString(consultation.chief_complaint) ||
    'Consultation follow-up';

  const notes =
    normalizeNullableString(payload.follow_up_notes) ||
    normalizeNullableString(consultation.advice) ||
    normalizeNullableString(consultation.notes);

  const priority = payload.follow_up_priority || 'normal';

  let followUp = await FollowUp.findOne({
    consultation_id: consultation._id,
    hospital_id: consultation.hospital_id,
    is_active: true,
  }).session(session);

  if (!followUp) {
    const created = await FollowUp.create(
      [
        {
          hospital_id: consultation.hospital_id,
          consultation_id: consultation._id,
          patient_id: consultation.patient_id,
          doctor_id: consultation.doctor_id,
          appointment_id: consultation.appointment_id || null,
          due_date: dueDate,
          reason,
          notes,
          status: 'pending',
          priority,
          created_by: actorId,
          updated_by: actorId,
          is_active: true,
        },
      ],
      { session }
    );

    return created[0];
  }

  followUp.patient_id = consultation.patient_id;
  followUp.doctor_id = consultation.doctor_id;
  followUp.appointment_id = consultation.appointment_id || null;
  followUp.due_date = dueDate;
  followUp.reason = reason;
  followUp.notes = notes;
  followUp.priority = priority;
  followUp.status = 'pending';
  followUp.updated_by = actorId;
  followUp.is_active = true;
  followUp.completed_at = null;
  followUp.completed_by = null;
  followUp.cancelled_at = null;
  followUp.cancelled_by = null;
  followUp.cancellation_reason = null;

  await followUp.save({ session });

  return followUp;
}

async function createConsultation(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'created_by');

  await Promise.all([
    ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, payload.doctor_id, hospitalId, 'doctor_id'),
  ]);

  if (payload.appointment_id) {
    const appointment = await ensureScopedReference(
      Appointment,
      payload.appointment_id,
      hospitalId,
      'appointment_id'
    );

    if (String(appointment.patient_id) !== String(payload.patient_id)) {
      throw new AppError(
        'appointment_id does not belong to the provided patient_id.',
        HTTP_STATUS.CONFLICT
      );
    }

    if (String(appointment.doctor_id) !== String(payload.doctor_id)) {
      throw new AppError(
        'appointment_id does not belong to the provided doctor_id.',
        HTTP_STATUS.CONFLICT
      );
    }
  }

  const createPayload = normalizeConsultationPayload(payload);

  const consultation = await Consultation.create({
    hospital_id: hospitalId,
    patient_id: createPayload.patient_id,
    doctor_id: createPayload.doctor_id,
    appointment_id: createPayload.appointment_id || null,
    chief_complaint: createPayload.chief_complaint || null,
    history_of_present_illness: createPayload.history_of_present_illness || null,
    vitals: createPayload.vitals || {},
    examination: createPayload.examination || {},
    diagnosis: createPayload.diagnosis || {},
    provisional_diagnosis: createPayload.provisional_diagnosis || null,
    advice: createPayload.advice || null,
    notes: createPayload.notes || null,
    follow_up_required: createPayload.follow_up_required || false,
    follow_up_date: createPayload.follow_up_date || null,
    created_by: actorId,
    updated_by: actorId,
    status: 'draft',
    is_active: true,
  });

  return getConsultationDetailById(consultation._id, hospitalId);
}

async function getConsultationDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  assertObjectId(id, 'consultation id');
  return getConsultationDetailById(id, hospitalId);
}

async function updateConsultation(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'updated_by');

  const consultation = await getScopedConsultation(id, hospitalId);

  if (consultation.status === 'finalised') {
    throw new AppError('Finalised consultations cannot be updated.', HTTP_STATUS.CONFLICT);
  }

  const normalized = normalizeConsultationPayload(payload);

  EDITABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      consultation[field] = normalized[field];
    }
  });

  consultation.updated_by = actorId;
  await consultation.save();

  return getConsultationDetailById(consultation._id, hospitalId);
}

async function updateConsultationStatus(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'updated_by');

  const consultation = await getScopedConsultation(id, hospitalId);
  const nextStatus = payload.status;

  if (consultation.status === 'finalised') {
    throw new AppError(
      'Finalised consultations cannot change status in this route.',
      HTTP_STATUS.CONFLICT
    );
  }

  if (nextStatus === 'finalised') {
    throw new AppError(
      'Use the finalise route to finalise a consultation.',
      HTTP_STATUS.CONFLICT
    );
  }

  if (consultation.status === nextStatus) {
    return getConsultationDetailById(consultation._id, hospitalId);
  }

  const allowedTransitions = STATUS_TRANSITIONS[consultation.status] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError(
      `Consultation status transition ${consultation.status} -> ${nextStatus} is not allowed.`,
      HTTP_STATUS.CONFLICT
    );
  }

  const now = new Date();

  consultation.status = nextStatus;
  consultation.updated_by = actorId;

  if (nextStatus === 'in_progress') {
    if (!consultation.started_at) {
      consultation.started_at = now;
    }

    if (
      consultation.started_at &&
      consultation.ended_at &&
      consultation.started_at > consultation.ended_at
    ) {
      consultation.started_at = consultation.ended_at;
    }
  }

  if (nextStatus === 'completed') {
    if (!consultation.started_at) {
      consultation.started_at = now;
    }

    if (!consultation.ended_at) {
      consultation.ended_at = now;
    }

    if (
      consultation.started_at &&
      consultation.ended_at &&
      consultation.started_at > consultation.ended_at
    ) {
      consultation.started_at = consultation.ended_at;
    }
  }

  await consultation.save();
  return getConsultationDetailById(consultation._id, hospitalId);
}

async function finaliseConsultation(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'finalised_by');

  const normalized = normalizeConsultationPayload(payload);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const consultation = await getScopedConsultation(id, hospitalId, session);

      if (consultation.status === 'finalised') {
        throw new AppError('Consultation is already finalised.', HTTP_STATUS.CONFLICT);
      }

      if (!['in_progress', 'completed'].includes(consultation.status)) {
        throw new AppError(
          'Only in_progress or completed consultations can be finalised.',
          HTTP_STATUS.CONFLICT
        );
      }

      if (Object.prototype.hasOwnProperty.call(normalized, 'follow_up_required')) {
        consultation.follow_up_required = normalized.follow_up_required;
      }

      if (Object.prototype.hasOwnProperty.call(normalized, 'follow_up_date')) {
        consultation.follow_up_date = normalized.follow_up_date;
      }

      if (consultation.follow_up_required === true && !consultation.follow_up_date) {
        throw new AppError(
          'follow_up_date is required when follow_up_required is true.',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const finalisedAt = new Date();

      if (consultation.status === 'in_progress') {
        if (!consultation.started_at) {
          consultation.started_at = finalisedAt;
        }

        if (!consultation.ended_at) {
          consultation.ended_at = finalisedAt;
        }
      }

      if (consultation.status === 'completed') {
        if (!consultation.ended_at) {
          consultation.ended_at = finalisedAt;
        }

        if (!consultation.started_at) {
          consultation.started_at = consultation.ended_at || finalisedAt;
        }
      }

      if (
        consultation.started_at &&
        consultation.ended_at &&
        consultation.started_at > consultation.ended_at
      ) {
        consultation.started_at = consultation.ended_at;
      }

      consultation.status = 'finalised';
      consultation.finalised_at = finalisedAt;
      consultation.finalised_by = actorId;
      consultation.updated_by = actorId;

      await consultation.save({ session });
      await createOrUpdateLinkedFollowUp(consultation, normalized, actorId, session);
    });
  } finally {
    await session.endSession();
  }

  return getConsultationDetailById(id, hospitalId);
}


async function getConsultationPdf(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const consultation = await getConsultationDetailById(id, hospitalId);
  return buildConsultationPdfPayload(consultation);
}

async function getConsultationWorkspace(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  assertObjectId(id, 'consultation id');

  const consultation = await getConsultationDetailById(id, hospitalId);
  const workspace = buildWorkspacePayload(consultation);
  workspace.follow_up_summary = consultation.follow_up_summary || null;

  return workspace;
}

async function listFollowUps(query = {}, currentUser = {}) {
  const filter = buildFollowUpFilter(query, currentUser);
  const { page, limit, skip } = normalizePagination(query);

  const [followUps, total] = await Promise.all([
    FollowUp.find(filter)
      .populate([
        { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
        { path: 'doctor_id', select: 'full_name speciality registration_number' },
        { path: 'consultation_id', select: 'status follow_up_required follow_up_date' },
        { path: 'appointment_id', select: 'scheduled_at status visit_type appointment_type_id is_active' },
      ])
      .sort({ due_date: 1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FollowUp.countDocuments(filter),
  ]);

  return {
    follow_ups: followUps,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getConsultationFollowUp(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const consultation = await getScopedConsultation(id, hospitalId);

  const followUp = await getFollowUpDetailQuery({
    consultation_id: consultation._id,
    hospital_id: hospitalId,
  })
    .sort({ is_active: -1, due_date: 1, createdAt: -1 })
    .lean();

  if (!followUp) {
    throw new AppError('Follow-up not found for consultation.', HTTP_STATUS.NOT_FOUND);
  }

  return followUp;
}

async function updateFollowUpStatus(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'updated_by');

  const followUp = await FollowUp.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!followUp) {
    throw new AppError('Follow-up not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (followUp.status !== 'pending') {
    throw new AppError(
      'Only pending follow-ups can change status in this route.',
      HTTP_STATUS.CONFLICT
    );
  }

  followUp.status = payload.status;
  followUp.updated_by = actorId;

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    followUp.notes = normalizeNullableString(payload.notes);
  }

  if (payload.status === 'completed') {
    followUp.completed_at = new Date();
    followUp.completed_by = actorId;
    followUp.is_active = false;
  }

  if (payload.status === 'cancelled') {
    followUp.cancelled_at = new Date();
    followUp.cancelled_by = actorId;
    followUp.cancellation_reason = normalizeNullableString(payload.cancellation_reason);
    followUp.is_active = false;
  }

  if (payload.status === 'missed') {
    followUp.is_active = false;
  }

  if (FOLLOW_UP_TERMINAL_STATUSES.has(payload.status)) {
    followUp.is_active = false;
  }

  await followUp.save();
  return getFollowUpDetailById(followUp._id, hospitalId);
}

module.exports = {
  createConsultation,
  getConsultationDetail,
  getConsultationPdf,
  updateConsultation,
  updateConsultationStatus,
  finaliseConsultation,
  getConsultationWorkspace,
  listFollowUps,
  getConsultationFollowUp,
  updateFollowUpStatus,
};