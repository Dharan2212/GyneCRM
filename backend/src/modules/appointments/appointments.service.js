'use strict';

const { db }            = require('../../db/connection');
const logger            = require('../../utils/logger');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES       = require('../../events/event-types');

/**
 * APPOINTMENTS SERVICE
 *
 * Architecture rules enforced:
 *  - hospital_id + branch_id scoping on every query
 *  - Slot conflict detection: (doctor_id, appointment_date, appointment_time)
 *    WHERE status NOT IN (cancelled, rescheduled, no_show, doctor_unavailable)
 *  - Doctor availability check: schedule settings + leave + intraday blocks
 *  - Status lifecycle: valid transitions enforced; invalid transitions rejected
 *  - Reschedule: marks original as 'rescheduled', creates new appointment,
 *    links via rescheduled_to_id
 *  - Cancellation: requires reason, sets cancellation_reason / cancelled_by / cancelled_at
 *  - All write operations append to activity_logs
 *  - Soft-delete only (admin action via DELETE endpoint)
 *
 * Phase 6 Batch 2 — Automation events wired:
 *  - APPOINTMENT_CREATED    → createAppointment, rescheduleAppointment (new slot)
 *  - APPOINTMENT_CANCELLED  → updateAppointmentStatus (when status = 'cancelled')
 *  - APPOINTMENT_CHECKED_IN → checkInAppointment + updateAppointmentStatus (checked_in)
 */

// ─── Error factory ────────────────────────────────────────────────────────────

/**
 * Creates a plain Error with .statusCode and .code attached.
 * Matches the pattern expected by the project error handler.
 */
function makeError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.isOperational = true;
  return err;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NON_BLOCKING_STATUSES = [
  'cancelled',
  'rescheduled',
  'no_show',
  'doctor_unavailable',
];

/**
 * Allowed forward transitions per status.
 * Any transition not listed here is rejected with INVALID_STATUS_TRANSITION.
 * Source of truth: hospital_crm_architecture_v4_complete.docx Section 8.2
 */
const ALLOWED_TRANSITIONS = {
  draft:                ['scheduled', 'confirmed', 'cancelled', 'pending_confirmation'],
  pending_confirmation: ['confirmed', 'cancelled', 'scheduled'],
  scheduled:            ['arrived', 'confirmed', 'checked_in', 'cancelled', 'no_show', 'rescheduled', 'doctor_unavailable'],
  confirmed:            ['arrived', 'checked_in', 'cancelled', 'no_show', 'rescheduled', 'doctor_unavailable', 'waiting'],
  arrived:              ['checked_in', 'no_show', 'cancelled'],
  checked_in:           ['waiting', 'with_doctor', 'in_consultation', 'cancelled'],
  waiting:              ['with_doctor', 'in_consultation', 'called', 'cancelled', 'no_show'],
  called:               ['with_doctor', 'in_consultation', 'checked_in', 'paused', 'no_show', 'cancelled'],
  paused:               ['called', 'waiting', 'cancelled'],
  with_doctor:          ['in_consultation', 'completed'],
  in_consultation:      ['completed', 'paused'],
  completed:            [],
  cancelled:            [],
  rescheduled:          [],
  no_show:              [],
  doctor_unavailable:   ['rescheduled'],
  walk_in:              ['checked_in', 'in_consultation', 'cancelled'],
  emergency:            ['checked_in', 'in_consultation', 'cancelled'],
};

// ─── Column selection ─────────────────────────────────────────────────────────

/**
 * Standard columns for appointment list/get queries.
 * Fixed (Phase 6 Batch 2): patients.name and u_doc.name — not full_name.
 * Removed: patients.patient_code (column does not exist in migration 013).
 */
const APPOINTMENT_COLUMNS = [
  'appointments.id',
  'appointments.hospital_id',
  'appointments.branch_id',
  'appointments.patient_id',
  'appointments.doctor_id',
  'appointments.appointment_type_id',
  'appointments.appointment_date',
  'appointments.appointment_time',
  'appointments.end_time',
  'appointments.status',
  'appointments.visit_type',
  'appointments.queue_token',
  'appointments.is_emergency',
  'appointments.booked_by',
  'appointments.cancellation_reason',
  'appointments.cancelled_by',
  'appointments.cancelled_at',
  'appointments.rescheduled_to_id',
  'appointments.reminder_24h_sent',
  'appointments.reminder_2h_sent',
  'appointments.notes',
  'appointments.is_deleted',
  'appointments.created_at',
  'appointments.updated_at',
  'patients.name as patient_name',       // patients.name — see migration 013
  'patients.phone as patient_phone',
  'patients.whatsapp_number as patient_whatsapp',
  'u_doc.name as doctor_name',           // users.name — see migration 009
  'branches.name as branch_name',
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

const auditLog = (trx, { hospitalId, actorId, action, entityId, meta = {} }) =>
  trx('activity_logs').insert({
    hospital_id: hospitalId,
    user_id:     actorId,
    action,
    module:      'appointments',
    entity_id:   entityId,
    entity_type: 'appointments',
    meta,
    created_at:  new Date(),
  });

/**
 * Base query builder with standard joins.
 * patients.name  — NOT full_name (migration 013 uses 'name')
 * u_doc.name     — NOT full_name (migration 009 uses 'name')
 */
const baseQuery = () =>
  db('appointments')
    .join('patients',    'appointments.patient_id', 'patients.id')
    .join('doctors',     'appointments.doctor_id',  'doctors.id')
    .join('users as u_doc', 'doctors.user_id',      'u_doc.id')
    .join('branches',    'appointments.branch_id',  'branches.id')
    .select(APPOINTMENT_COLUMNS);

/**
 * Fetch hospital name and phone for automation payloads.
 * Returns { hospitalName, hospitalPhone }.
 * Never throws — falls back to empty strings on error.
 *
 * @param {string} hospitalId
 * @returns {Promise<{ hospitalName: string, hospitalPhone: string }>}
 */
async function fetchHospitalInfo(hospitalId) {
  try {
    const hospital = await db('hospitals')
      .where('id', hospitalId)
      .select('name', 'phone')
      .first();
    return {
      hospitalName:  hospital ? hospital.name  : '',
      hospitalPhone: hospital ? hospital.phone : '',
    };
  } catch (err) {
    logger.warn('[appointments.service] fetchHospitalInfo failed', {
      hospitalId,
      error: err.message,
    });
    return { hospitalName: '', hospitalPhone: '' };
  }
}

const computeEndTime = (startTimeStr, durationMinutes) => {
  const [hh, mm] = startTimeStr.split(':').map(Number);
  const totalMinutes = hh * 60 + mm + durationMinutes;
  const endHh = Math.floor(totalMinutes / 60) % 24;
  const endMm = totalMinutes % 60;
  return `${String(endHh).padStart(2, '0')}:${String(endMm).padStart(2, '0')}`;
};

const getSlotDuration = async (doctorId, hospitalId, appointmentDate) => {
  const dayName = new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long' });
  const schedule = await db('doctor_schedule_settings')
    .where({ doctor_id: doctorId, hospital_id: hospitalId, day_of_week: dayName, is_active: true })
    .first('slot_duration_minutes', 'start_time', 'end_time', 'max_patients');
  return schedule || { slot_duration_minutes: 15, start_time: null, end_time: null, max_patients: null };
};

// ─── Conflict detection ───────────────────────────────────────────────────────

const checkSlotConflict = async ({ doctorId, appointmentDate, appointmentTime, endTime, excludeAppointmentId = null }) => {
  let conflictQuery = db('appointments')
    .where({
      doctor_id:        doctorId,
      appointment_date: appointmentDate,
      is_deleted:       false,
    })
    .whereNotIn('status', NON_BLOCKING_STATUSES)
    .where((qb) => {
      qb.where((inner) =>
        inner
          .where('appointment_time', '<', endTime)
          .where((innermost) =>
            innermost
              .whereRaw('end_time IS NOT NULL AND end_time > ?', [appointmentTime])
              .orWhereRaw('end_time IS NULL AND appointment_time = ?', [appointmentTime])
          )
      );
    });

  if (excludeAppointmentId) {
    conflictQuery = conflictQuery.whereNot({ id: excludeAppointmentId });
  }

  const conflict = await conflictQuery.first('id', 'appointment_time', 'end_time', 'status');

  if (conflict) {
    throw makeError(
      409,
      'SLOT_CONFLICT',
      `Doctor already has an appointment at ${conflict.appointment_time}${conflict.end_time ? '–' + conflict.end_time : ''} (status: ${conflict.status}).`,
    );
  }
};

// ─── Doctor availability ──────────────────────────────────────────────────────

const checkDoctorAvailability = async ({ doctorId, hospitalId, appointmentDate, appointmentTime }) => {
  const dayName = new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long' });

  const schedule = await db('doctor_schedule_settings')
    .where({ doctor_id: doctorId, hospital_id: hospitalId, day_of_week: dayName, is_active: true })
    .first('start_time', 'end_time', 'max_patients', 'slot_duration_minutes');

  if (!schedule) {
    throw makeError(422, 'DOCTOR_NOT_SCHEDULED', `Doctor does not have a schedule configured for ${dayName}.`);
  }

  if (appointmentTime < schedule.start_time || appointmentTime >= schedule.end_time) {
    throw makeError(
      422,
      'OUTSIDE_WORKING_HOURS',
      `Requested time ${appointmentTime} is outside the doctor's working hours (${schedule.start_time}–${schedule.end_time}) on ${dayName}.`,
    );
  }

  const leave = await db('doctor_leaves')
    .where({ doctor_id: doctorId, leave_date: appointmentDate })
    .where((qb) =>
      qb
        .where('leave_type', 'full_day')
        .orWhere((inner) =>
          inner
            .where('leave_type', '!=', 'full_day')
            .where('start_time', '<=', appointmentTime)
            .where('end_time',   '>',  appointmentTime)
        )
    )
    .first('id', 'leave_type', 'reason');

  if (leave) {
    throw makeError(422, 'DOCTOR_ON_LEAVE', `Doctor is on leave for this slot${leave.reason ? ': ' + leave.reason : ''}.`);
  }

  const block = await db('doctor_schedule_blocks')
    .where({ doctor_id: doctorId, block_date: appointmentDate })
    .where('block_start', '<=', appointmentTime)
    .where('block_end',   '>',  appointmentTime)
    .first('id', 'block_type', 'label');

  if (block) {
    throw makeError(422, 'SLOT_BLOCKED', `This slot is blocked for the doctor (${block.label || block.block_type}).`);
  }

  if (schedule.max_patients !== null) {
    const [{ count }] = await db('appointments')
      .where({ doctor_id: doctorId, appointment_date: appointmentDate, is_deleted: false })
      .whereNotIn('status', NON_BLOCKING_STATUSES)
      .count({ count: '*' });

    if (parseInt(count, 10) >= schedule.max_patients) {
      throw makeError(422, 'DOCTOR_FULLY_BOOKED', `Doctor has reached the maximum patient cap (${schedule.max_patients}) for ${appointmentDate}.`);
    }
  }

  return schedule;
};

// ─── Queue token ──────────────────────────────────────────────────────────────

/**
 * Generate the next Q-NNN queue token for a branch on a given date.
 * Counts existing checked_in/waiting/with_doctor/in_consultation/completed
 * appointments for that branch today and assigns the next sequence number.
 *
 * @param {string} branchId
 * @param {string} appointmentDate  YYYY-MM-DD
 * @returns {Promise<string>} e.g. "Q-001"
 */
async function generateQueueToken(branchId, appointmentDate) {
  const [{ count }] = await db('appointments')
    .where({ branch_id: branchId, appointment_date: appointmentDate, is_deleted: false })
    .whereIn('status', ['checked_in', 'waiting', 'with_doctor', 'in_consultation', 'completed', 'called'])
    .count({ count: '*' });

  const seq = parseInt(count, 10) + 1;
  return `Q-${String(seq).padStart(3, '0')}`;
}

// ─── Service methods ──────────────────────────────────────────────────────────

const listAppointments = async ({
  hospitalId, page, limit,
  doctor_id, patient_id, branch_id, status, date_from, date_to, visit_type,
}) => {
  const offset = (page - 1) * limit;

  let query = baseQuery()
    .where({ 'appointments.hospital_id': hospitalId, 'appointments.is_deleted': false });

  if (doctor_id)  query = query.where('appointments.doctor_id',  doctor_id);
  if (patient_id) query = query.where('appointments.patient_id', patient_id);
  if (branch_id)  query = query.where('appointments.branch_id',  branch_id);
  if (status)     query = query.where('appointments.status',     status);
  if (visit_type) query = query.where('appointments.visit_type', visit_type);
  if (date_from)  query = query.where('appointments.appointment_date', '>=', date_from);
  if (date_to)    query = query.where('appointments.appointment_date', '<=', date_to);

  const [{ count }]  = await query.clone().count({ count: '*' });
  const appointments = await query
    .orderBy('appointments.appointment_date', 'asc')
    .orderBy('appointments.appointment_time', 'asc')
    .limit(limit)
    .offset(offset);

  return {
    appointments,
    pagination: {
      total:       parseInt(count, 10),
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  };
};

const getAppointmentById = async (hospitalId, appointmentId) => {
  const appointment = await baseQuery()
    .where({
      'appointments.id':         appointmentId,
      'appointments.hospital_id': hospitalId,
      'appointments.is_deleted':  false,
    })
    .first();

  if (!appointment) {
    throw makeError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');
  }

  return appointment;
};

/**
 * Book a new appointment.
 *
 * Phase 6 Batch 2: Dispatches APPOINTMENT_CREATED after successful insert.
 * Payload includes hospital_name + hospital_phone for WhatsApp template rendering.
 */
const createAppointment = async (hospitalId, payload, actorId) => {
  const {
    patient_id,
    doctor_id,
    branch_id,
    appointment_date,
    appointment_time,
    visit_type,
    appointment_type_id,
    notes,
    is_emergency,
  } = payload;

  const dateStr = new Date(appointment_date).toISOString().split('T')[0];

  // Validate patient belongs to hospital
  const patient = await db('patients')
    .where({ id: patient_id, hospital_id: hospitalId, is_deleted: false })
    .first('id', 'name', 'phone', 'whatsapp_number');

  if (!patient) {
    throw makeError(404, 'PATIENT_NOT_FOUND', 'Patient not found in this hospital.');
  }

  // Validate doctor belongs to hospital
  const doctor = await db('doctors')
    .where({ id: doctor_id, hospital_id: hospitalId, is_active: true })
    .join('users', 'doctors.user_id', 'users.id')
    .first('doctors.id', 'users.name as doctor_name');

  if (!doctor) {
    throw makeError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found or is inactive.');
  }

  // Validate branch belongs to hospital
  const branch = await db('branches')
    .where({ id: branch_id, hospital_id: hospitalId, is_active: true })
    .first('id', 'name');

  if (!branch) {
    throw makeError(404, 'BRANCH_NOT_FOUND', 'Branch not found or is inactive.');
  }

  let scheduleRow = { slot_duration_minutes: 15 };

  if (!is_emergency) {
    scheduleRow = await checkDoctorAvailability({
      doctorId: doctor_id,
      hospitalId,
      appointmentDate: dateStr,
      appointmentTime: appointment_time,
    });
  } else {
    scheduleRow = await getSlotDuration(doctor_id, hospitalId, dateStr);
  }

  const endTime = computeEndTime(appointment_time, scheduleRow.slot_duration_minutes);
  const now     = new Date();

  const newAppointment = await db.transaction(async (trx) => {
    await trx.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    await checkSlotConflict({
      doctorId: doctor_id,
      appointmentDate: dateStr,
      appointmentTime: appointment_time,
      endTime,
    });

    const [inserted] = await trx('appointments')
      .insert({
        hospital_id:         hospitalId,
        branch_id,
        patient_id,
        doctor_id,
        appointment_type_id: appointment_type_id || null,
        appointment_date:    dateStr,
        appointment_time,
        end_time:            endTime,
        status:              is_emergency ? 'walk_in' : 'confirmed',
        visit_type,
        is_emergency:        !!is_emergency,
        booked_by:           actorId,
        notes:               notes || null,
        reminder_24h_sent:   false,
        reminder_2h_sent:    false,
        is_deleted:          false,
        created_at:          now,
        updated_at:          now,
      })
      .returning('id');

    await auditLog(trx, {
      hospitalId,
      actorId,
      action:   'CREATE_APPOINTMENT',
      entityId: inserted.id,
      meta: { patient_id, doctor_id, branch_id, appointment_date: dateStr, appointment_time, visit_type, is_emergency },
    });

    return inserted;
  });

  logger.info(`Appointment created: ${newAppointment.id} for patient ${patient_id} with doctor ${doctor_id}`);

  const appt = await getAppointmentById(hospitalId, newAppointment.id);

  // ── Phase 6 Batch 2: Dispatch APPOINTMENT_CREATED ─────────────────────────
  // Fire-and-forget — must not block API response.
  const { hospitalName, hospitalPhone } = await fetchHospitalInfo(hospitalId);

  dispatchEvent(
    EVENT_TYPES.APPOINTMENT_CREATED,
    {
      patientId:       patient_id,
      entityType:      'appointment',
      entityId:        newAppointment.id,
      branchId:        branch_id,
      actorUserId:     actorId,
      // Template variables (arch Workflow 1)
      patientName:     patient.name,
      patientPhone:    patient.whatsapp_number || patient.phone,
      doctorName:      doctor.doctor_name,
      appointmentDate: dateStr,
      appointmentTime: appointment_time,
      hospitalName,
      hospitalPhone,
      visitType:       visit_type,
      isEmergency:     !!is_emergency,
    },
    hospitalId,
  ).catch((err) => {
    logger.error(`[appointments.service] APPOINTMENT_CREATED dispatch error for ${newAppointment.id}: ${err.message}`);
  });

  return appt;
};

/**
 * Patch appointment status.
 *
 * Phase 6 Batch 2: Dispatches:
 *   - APPOINTMENT_CANCELLED when newStatus = 'cancelled'
 *   - APPOINTMENT_CHECKED_IN when newStatus = 'checked_in'
 */
const updateAppointmentStatus = async (hospitalId, appointmentId, payload, actorId) => {
  const appointment = await getAppointmentById(hospitalId, appointmentId);
  const { status: newStatus, cancellation_reason } = payload;

  const currentStatus = appointment.status;
  const allowedNext   = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(newStatus)) {
    throw makeError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition appointment from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNext.join(', ') || 'none'}].`,
    );
  }

  const now     = new Date();
  const updates = { status: newStatus, updated_at: now };

  if (newStatus === 'cancelled') {
    updates.cancellation_reason = cancellation_reason;
    updates.cancelled_by        = actorId;
    updates.cancelled_at        = now;
  }

  await db.transaction(async (trx) => {
    await trx('appointments')
      .where({ id: appointmentId, hospital_id: hospitalId })
      .update(updates);

    await auditLog(trx, {
      hospitalId,
      actorId,
      action:   'UPDATE_APPOINTMENT_STATUS',
      entityId: appointmentId,
      meta: {
        from_status:         currentStatus,
        to_status:           newStatus,
        cancellation_reason: cancellation_reason || null,
      },
    });
  });

  const updated = await getAppointmentById(hospitalId, appointmentId);

  // ── Phase 6 Batch 2: Dispatch status-change events ────────────────────────
  if (newStatus === 'cancelled') {
    const { hospitalName, hospitalPhone } = await fetchHospitalInfo(hospitalId);

    dispatchEvent(
      EVENT_TYPES.APPOINTMENT_CANCELLED,
      {
        patientId:          appointment.patient_id,
        entityType:         'appointment',
        entityId:           appointmentId,
        branchId:           appointment.branch_id,
        actorUserId:        actorId,
        patientName:        appointment.patient_name,
        patientPhone:       appointment.patient_whatsapp || appointment.patient_phone,
        doctorName:         appointment.doctor_name,
        appointmentDate:    appointment.appointment_date,
        appointmentTime:    appointment.appointment_time,
        cancellationReason: cancellation_reason || null,
        hospitalName,
        hospitalPhone,
      },
      hospitalId,
    ).catch((err) => {
      logger.error(`[appointments.service] APPOINTMENT_CANCELLED dispatch error for ${appointmentId}: ${err.message}`);
    });

    // ── Phase 6 Batch 4: WAITLIST_SLOT_AVAILABLE ──────────────────────────
    // When an appointment is cancelled, check if any patient is on the
    // waitlist for the same doctor on the same date or preferring that doctor.
    // If a waiting patient exists, offer them the slot by:
    //   1. Setting their waitlist status → 'offered'
    //   2. Setting expires_at = NOW() + 2 hours (arch: 2h window to accept)
    //   3. Dispatching WAITLIST_SLOT_AVAILABLE to N8N for WhatsApp notification
    // Only the first 'waiting' entry (oldest by created_at) is offered per slot.
    void _checkAndOfferWaitlistSlot({
      hospitalId,
      doctorId:        appointment.doctor_id,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      branchId:        appointment.branch_id,
      hospitalName,
      hospitalPhone,
    }).catch((err) => {
      logger.error(`[appointments.service] Waitlist slot check failed for cancelled appointment ${appointmentId}: ${err.message}`);
    });
  }

  if (newStatus === 'checked_in') {
    const { hospitalName } = await fetchHospitalInfo(hospitalId);

    dispatchEvent(
      EVENT_TYPES.APPOINTMENT_CHECKED_IN,
      {
        patientId:       appointment.patient_id,
        entityType:      'appointment',
        entityId:        appointmentId,
        branchId:        appointment.branch_id,
        actorUserId:     actorId,
        patientName:     appointment.patient_name,
        patientPhone:    appointment.patient_whatsapp || appointment.patient_phone,
        doctorName:      appointment.doctor_name,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        hospitalName,
        queueToken:      updated.queue_token || null,
      },
      hospitalId,
    ).catch((err) => {
      logger.error(`[appointments.service] APPOINTMENT_CHECKED_IN dispatch error for ${appointmentId}: ${err.message}`);
    });
  }

  return updated;
};

/**
 * Dedicated check-in operation.
 *
 * Transitions appointment → 'checked_in', generates Q-NNN queue token,
 * dispatches APPOINTMENT_CHECKED_IN to N8N.
 *
 * Valid from statuses: arrived, confirmed, scheduled (arch: arrived → checked_in,
 * simplified: scheduled → checked_in per roadmap).
 */
const checkInAppointment = async (hospitalId, appointmentId, actorId) => {
  const appointment = await getAppointmentById(hospitalId, appointmentId);

  const checkInableStatuses = ['arrived', 'confirmed', 'scheduled', 'walk_in', 'emergency'];

  if (!checkInableStatuses.includes(appointment.status)) {
    throw makeError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot check in appointment with status '${appointment.status}'. Expected: arrived, confirmed, or scheduled.`,
    );
  }

  if (appointment.queue_token) {
    throw makeError(409, 'ALREADY_CHECKED_IN', 'Appointment has already been checked in.');
  }

  const dateStr    = new Date(appointment.appointment_date).toISOString().split('T')[0];
  const queueToken = await generateQueueToken(appointment.branch_id, dateStr);
  const now        = new Date();

  await db.transaction(async (trx) => {
    await trx('appointments')
      .where({ id: appointmentId, hospital_id: hospitalId })
      .update({
        status:      'checked_in',
        queue_token: queueToken,
        updated_at:  now,
      });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action:   'CHECK_IN_APPOINTMENT',
      entityId: appointmentId,
      meta: {
        from_status: appointment.status,
        queue_token: queueToken,
      },
    });
  });

  logger.info(`[appointments.service] Check-in: appointment ${appointmentId} → checked_in, token ${queueToken}`);

  const checked = await getAppointmentById(hospitalId, appointmentId);

  // ── Phase 6 Batch 2: Dispatch APPOINTMENT_CHECKED_IN ─────────────────────
  const { hospitalName } = await fetchHospitalInfo(hospitalId);

  dispatchEvent(
    EVENT_TYPES.APPOINTMENT_CHECKED_IN,
    {
      patientId:       appointment.patient_id,
      entityType:      'appointment',
      entityId:        appointmentId,
      branchId:        appointment.branch_id,
      actorUserId:     actorId,
      patientName:     appointment.patient_name,
      patientPhone:    appointment.patient_whatsapp || appointment.patient_phone,
      doctorName:      appointment.doctor_name,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      hospitalName,
      queueToken,
    },
    hospitalId,
  ).catch((err) => {
    logger.error(`[appointments.service] APPOINTMENT_CHECKED_IN dispatch error for ${appointmentId}: ${err.message}`);
  });

  return checked;
};

/**
 * Reschedule an appointment.
 *
 * Phase 6 Batch 2: Dispatches APPOINTMENT_CREATED for the new appointment slot.
 * The new slot triggers a fresh WhatsApp confirmation to the patient.
 */
const rescheduleAppointment = async (hospitalId, appointmentId, payload, actorId) => {
  const original = await getAppointmentById(hospitalId, appointmentId);

  const terminalStatuses = ['cancelled', 'rescheduled', 'completed', 'no_show', 'doctor_unavailable'];
  if (terminalStatuses.includes(original.status)) {
    throw makeError(
      422,
      'CANNOT_RESCHEDULE',
      `Appointment with status '${original.status}' cannot be rescheduled.`,
    );
  }

  const newDate     = new Date(payload.appointment_date).toISOString().split('T')[0];
  const newTime     = payload.appointment_time;
  const newDoctorId = payload.doctor_id || original.doctor_id;
  const newBranchId = payload.branch_id || original.branch_id;

  if (payload.branch_id) {
    const branch = await db('branches')
      .where({ id: newBranchId, hospital_id: hospitalId, is_active: true })
      .first('id');
    if (!branch) {
      throw makeError(404, 'BRANCH_NOT_FOUND', 'New branch not found or inactive.');
    }
  }

  const scheduleRow = await checkDoctorAvailability({
    doctorId:        newDoctorId,
    hospitalId,
    appointmentDate: newDate,
    appointmentTime: newTime,
  });

  const newEndTime = computeEndTime(newTime, scheduleRow.slot_duration_minutes);

  await checkSlotConflict({
    doctorId:        newDoctorId,
    appointmentDate: newDate,
    appointmentTime: newTime,
    endTime:         newEndTime,
  });

  const now = new Date();

  // Fetch doctor name for new doctor if changed
  let newDoctorName = original.doctor_name;
  if (payload.doctor_id && payload.doctor_id !== original.doctor_id) {
    const newDoc = await db('doctors')
      .where({ id: newDoctorId, hospital_id: hospitalId })
      .join('users', 'doctors.user_id', 'users.id')
      .first('users.name as doctor_name');
    if (newDoc) newDoctorName = newDoc.doctor_name;
  }

  const result = await db.transaction(async (trx) => {
    await trx.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    await checkSlotConflict({
      doctorId:        newDoctorId,
      appointmentDate: newDate,
      appointmentTime: newTime,
      endTime:         newEndTime,
    });

    const [newAppt] = await trx('appointments')
      .insert({
        hospital_id:         hospitalId,
        branch_id:           newBranchId,
        patient_id:          original.patient_id,
        doctor_id:           newDoctorId,
        appointment_type_id: original.appointment_type_id || null,
        appointment_date:    newDate,
        appointment_time:    newTime,
        end_time:            newEndTime,
        status:              'confirmed',
        visit_type:          original.visit_type,
        is_emergency:        original.is_emergency,
        booked_by:           actorId,
        notes:               payload.reason ? `Rescheduled: ${payload.reason}` : original.notes,
        reminder_24h_sent:   false,
        reminder_2h_sent:    false,
        is_deleted:          false,
        created_at:          now,
        updated_at:          now,
      })
      .returning('id');

    await trx('appointments')
      .where({ id: appointmentId, hospital_id: hospitalId })
      .update({
        status:           'rescheduled',
        rescheduled_to_id: newAppt.id,
        updated_at:        now,
      });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action:   'RESCHEDULE_APPOINTMENT',
      entityId: appointmentId,
      meta: {
        original_appointment_id: appointmentId,
        new_appointment_id:      newAppt.id,
        new_date:                newDate,
        new_time:                newTime,
        reason:                  payload.reason || null,
      },
    });

    return newAppt;
  });

  logger.info(`Appointment ${appointmentId} rescheduled to new appointment ${result.id}`);

  const newApptFull = await getAppointmentById(hospitalId, result.id);

  // ── Phase 6 Batch 2: Dispatch APPOINTMENT_CREATED for new slot ────────────
  // Patient receives a fresh WhatsApp confirmation for the rescheduled slot.
  const { hospitalName, hospitalPhone } = await fetchHospitalInfo(hospitalId);

  // Fetch patient phone
  const patient = await db('patients')
    .where('id', original.patient_id)
    .first('name', 'phone', 'whatsapp_number');

  dispatchEvent(
    EVENT_TYPES.APPOINTMENT_CREATED,
    {
      patientId:       original.patient_id,
      entityType:      'appointment',
      entityId:        result.id,
      branchId:        newBranchId,
      actorUserId:     actorId,
      patientName:     patient ? patient.name : original.patient_name,
      patientPhone:    patient ? (patient.whatsapp_number || patient.phone) : original.patient_phone,
      doctorName:      newDoctorName,
      appointmentDate: newDate,
      appointmentTime: newTime,
      hospitalName,
      hospitalPhone,
      visitType:       original.visit_type,
      isRescheduled:   true,
      originalAppointmentId: appointmentId,
    },
    hospitalId,
  ).catch((err) => {
    logger.error(`[appointments.service] APPOINTMENT_CREATED (reschedule) dispatch error for ${result.id}: ${err.message}`);
  });

  return newApptFull;
};

/**
 * Soft-delete an appointment (admin only).
 */
const deleteAppointment = async (hospitalId, appointmentId, actorId) => {
  const appointment = await getAppointmentById(hospitalId, appointmentId);

  if (appointment.is_deleted) {
    throw makeError(409, 'ALREADY_DELETED', 'Appointment is already deleted.');
  }

  const now = new Date();

  await db.transaction(async (trx) => {
    await trx('appointments')
      .where({ id: appointmentId, hospital_id: hospitalId })
      .update({ is_deleted: true, deleted_at: now, deleted_by: actorId, updated_at: now });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action:   'DELETE_APPOINTMENT',
      entityId: appointmentId,
      meta: { patient_id: appointment.patient_id, doctor_id: appointment.doctor_id },
    });
  });

  logger.info(`Appointment soft-deleted: ${appointmentId} by user ${actorId}`);
  return { id: appointmentId, deleted: true };
};

// ─── Phase 6 Batch 4: Waitlist slot offer helper ─────────────────────────────

/**
 * Check if any patient is waiting for the given doctor/date slot and offer it.
 *
 * Called fire-and-forget (void) after an appointment is cancelled.
 *
 * Logic:
 *   1. Find the oldest 'waiting' waitlist row for this hospital + doctor.
 *   2. Transition status → 'offered', set expires_at = NOW() + 2h.
 *   3. Dispatch WAITLIST_SLOT_AVAILABLE to N8N for WhatsApp notification.
 *
 * Deduplication: row transitions to 'offered' — won't match again until expired.
 * waitlistExpiryJob handles expiry back to available state.
 *
 * Template variables: patientName, doctorName, slotDate, slotTime
 *
 * @param {object} slot
 */
async function _checkAndOfferWaitlistSlot({
  hospitalId, doctorId, appointmentDate, appointmentTime, branchId, hospitalName, hospitalPhone,
}) {
  const waitlistEntry = await db('waitlist as w')
    .where({ 'w.hospital_id': hospitalId, 'w.doctor_id': doctorId, 'w.status': 'waiting' })
    .orderBy('w.created_at', 'asc')
    .first('w.id', 'w.patient_id', 'w.doctor_id');

  if (!waitlistEntry) {
    logger.debug(`[appointments.service] No waiting patient for doctor ${doctorId} in hospital ${hospitalId}.`);
    return;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const updatedRows = await db('waitlist')
    .where({ id: waitlistEntry.id, status: 'waiting' })
    .update({ status: 'offered', expires_at: expiresAt, updated_at: db.fn.now() });

  if (updatedRows === 0) {
    logger.debug(`[appointments.service] Waitlist entry ${waitlistEntry.id} was already updated concurrently.`);
    return;
  }

  const [patient, doctorRow] = await Promise.all([
    db('patients').where('id', waitlistEntry.patient_id).first('name', 'phone', 'whatsapp_number'),
    db('doctors').where('id', doctorId)
      .join('users', 'doctors.user_id', 'users.id')
      .first('users.name as doctor_name'),
  ]);

  dispatchEvent(
    EVENT_TYPES.WAITLIST_SLOT_AVAILABLE,
    {
      patientId:     waitlistEntry.patient_id,
      entityType:    'waitlist',
      entityId:      waitlistEntry.id,
      branchId:      branchId || null,
      actorUserId:   null,
      // Template variables (template-map: waitlist_slot_available)
      patientName:   patient ? patient.name : '',
      patientPhone:  patient ? (patient.whatsapp_number || patient.phone) : '',
      doctorName:    doctorRow ? doctorRow.doctor_name : '',
      slotDate:      appointmentDate,
      slotTime:      appointmentTime,
      hospitalName,
      hospitalPhone: hospitalPhone || '',
      waitlistId:    waitlistEntry.id,
      expiresAt:     expiresAt.toISOString(),
    },
    hospitalId,
  ).catch((err) => {
    logger.error(`[appointments.service] WAITLIST_SLOT_AVAILABLE dispatch error for entry ${waitlistEntry.id}: ${err.message}`);
  });

  logger.info(`[appointments.service] Waitlist slot offered: entry ${waitlistEntry.id} → patient ${waitlistEntry.patient_id} for doctor ${doctorId} on ${appointmentDate} ${appointmentTime}`);
}

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
  deleteAppointment,
  ALLOWED_TRANSITIONS,
  NON_BLOCKING_STATUSES,
};
