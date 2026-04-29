const mongoose = require('mongoose');
const Appointment = require('../../models/Appointment');
const Waitlist = require('../../models/Waitlist');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const AppointmentType = require('../../models/AppointmentType');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const {
  normalizePagination,
  resolveHospitalId,
  buildAppointmentFilter,
} = require('./appointments.query');
const { buildWaitlistFilter } = require('./appointments.waitlist.query');

const ACTIVE_CONFLICT_STATUSES = ['scheduled', 'checked_in'];
const DETAIL_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'doctor_id', select: 'full_name speciality registration_number' },
  { path: 'appointment_type_id', select: 'name code is_active' },
];
const WAITLIST_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'preferred_doctor_id', select: 'full_name speciality registration_number' },
  { path: 'appointment_type_id', select: 'name code is_active' },
  { path: 'source_appointment_id', select: 'scheduled_at status visit_type' },
  { path: 'converted_to_appointment_id', select: 'scheduled_at status visit_type' },
];

async function ensureScopedReference(Model, id, hospitalId, label) {
  assertObjectId(id, label);

  const exists = await Model.findOne({
    _id: id,
    hospital_id: hospitalId,
    ...(Model === Patient ? { is_deleted: false } : {}),
  })
    .select('_id hospital_id')
    .lean();

  if (!exists) {
    throw new AppError(`${label} not found.`, HTTP_STATUS.NOT_FOUND);
  }

  return exists;
}

async function ensureDoctorSlotConflict({ hospitalId, doctorId, scheduledAt, excludeAppointmentId = null, session = null }) {
  const filter = {
    hospital_id: hospitalId,
    doctor_id: doctorId,
    scheduled_at: scheduledAt,
    is_active: true,
    status: { $in: ACTIVE_CONFLICT_STATUSES },
  };

  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  const existing = await Appointment.findOne(filter)
    .select('_id scheduled_at status')
    .session(session || null)
    .lean();

  if (existing) {
    throw new AppError(
      'An active appointment already exists for this doctor at the same scheduled time.',
      HTTP_STATUS.CONFLICT,
    );
  }
}

async function listAppointments(query = {}, currentUser = {}) {
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildAppointmentFilter(query, currentUser);

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate(DETAIL_POPULATE)
      .sort({ scheduled_at: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return {
    appointments,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function createAppointment(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const bookedBy = currentUser.id || payload.booked_by;

  if (!bookedBy) {
    throw new AppError('booked_by is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(bookedBy, 'booked_by');

  await Promise.all([
    ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, payload.doctor_id, hospitalId, 'doctor_id'),
    ensureScopedReference(AppointmentType, payload.appointment_type_id, hospitalId, 'appointment_type_id'),
  ]);

  const scheduledAt = new Date(payload.scheduled_at);
  await ensureDoctorSlotConflict({
    hospitalId,
    doctorId: payload.doctor_id,
    scheduledAt,
  });

  const appointment = await Appointment.create({
    hospital_id: hospitalId,
    patient_id: payload.patient_id,
    doctor_id: payload.doctor_id,
    appointment_type_id: payload.appointment_type_id,
    scheduled_at: scheduledAt,
    duration_minutes: payload.duration_minutes,
    visit_type: payload.visit_type,
    reason_for_visit: payload.reason_for_visit || null,
    notes: payload.notes || null,
    booked_by: bookedBy,
    status: 'scheduled',
    is_active: true,
  });

  return Appointment.findById(appointment._id).populate(DETAIL_POPULATE).lean();
}

async function getAppointmentDetail(id, currentUser = {}) {
  assertObjectId(id, 'appointment id');

  const appointment = await Appointment.findOne({
    _id: id,
    hospital_id: resolveHospitalId(null, currentUser),
  })
    .populate(DETAIL_POPULATE)
    .lean();

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  return appointment;
}

async function updateAppointmentStatus(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'appointment id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const appointment = await Appointment.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (appointment.status !== 'scheduled') {
    throw new AppError('Only scheduled appointments can be cancelled or marked no_show in this route.', HTTP_STATUS.CONFLICT);
  }

  if (payload.status === 'cancelled') {
    appointment.status = 'cancelled';
    appointment.cancelled_at = new Date();
    appointment.cancelled_by = actorId;
    appointment.cancellation_reason = payload.cancellation_reason || null;
    appointment.is_active = false;
  }

  if (payload.status === 'no_show') {
    appointment.status = 'no_show';
    appointment.no_show_marked_at = new Date();
    appointment.no_show_marked_by = actorId;
    appointment.is_active = false;
  }

  await appointment.save();
  return Appointment.findById(appointment._id).populate(DETAIL_POPULATE).lean();
}

async function checkInAppointment(id, currentUser = {}) {
  assertObjectId(id, 'appointment id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const appointment = await Appointment.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (appointment.status !== 'scheduled') {
    throw new AppError('Only scheduled appointments can be checked in.', HTTP_STATUS.CONFLICT);
  }

  appointment.status = 'checked_in';
  appointment.checked_in_at = new Date();
  appointment.checked_in_by = actorId;

  await appointment.save();
  return Appointment.findById(appointment._id).populate(DETAIL_POPULATE).lean();
}

async function rescheduleAppointment(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'appointment id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const appointment = await Appointment.findOne({
        _id: id,
        hospital_id: hospitalId,
      }).session(session);

      if (!appointment) {
        throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
      }

      if (appointment.status !== 'scheduled') {
        throw new AppError('Only scheduled appointments can be rescheduled.', HTTP_STATUS.CONFLICT);
      }

      const newScheduledAt = new Date(payload.scheduled_at);
      const newDuration = payload.duration_minutes || appointment.duration_minutes;

      await ensureDoctorSlotConflict({
        hospitalId,
        doctorId: String(appointment.doctor_id),
        scheduledAt: newScheduledAt,
        excludeAppointmentId: appointment._id,
        session,
      });

      appointment.status = 'rescheduled';
      appointment.is_active = false;
      appointment.rescheduled_by = actorId;
      appointment.reschedule_reason = payload.reschedule_reason || null;
      await appointment.save({ session, validateBeforeSave: true });

      const [newAppointment] = await Appointment.create(
        [
          {
            hospital_id: appointment.hospital_id,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            appointment_type_id: appointment.appointment_type_id,
            scheduled_at: newScheduledAt,
            duration_minutes: newDuration,
            visit_type: appointment.visit_type,
            status: 'scheduled',
            reason_for_visit: appointment.reason_for_visit,
            notes: payload.notes !== undefined ? payload.notes : appointment.notes,
            booked_by: appointment.booked_by,
            rescheduled_from: appointment._id,
            rescheduled_by: actorId,
            reschedule_reason: payload.reschedule_reason || null,
            is_active: true,
          },
        ],
        { session },
      );

      const populatedOld = await Appointment.findById(appointment._id).populate(DETAIL_POPULATE).session(session).lean();
      const populatedNew = await Appointment.findById(newAppointment._id).populate(DETAIL_POPULATE).session(session).lean();

      result = {
        old_appointment: populatedOld,
        new_appointment: populatedNew,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function listWaitlist(query = {}, currentUser = {}) {
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildWaitlistFilter(query, currentUser);

  const [items, total] = await Promise.all([
    Waitlist.find(filter)
      .populate(WAITLIST_POPULATE)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Waitlist.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function createWaitlist(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const createdBy = currentUser.id;

  if (!createdBy) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  await ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id');

  if (payload.preferred_doctor_id) {
    await ensureScopedReference(Doctor, payload.preferred_doctor_id, hospitalId, 'preferred_doctor_id');
  }

  if (payload.appointment_type_id) {
    await ensureScopedReference(AppointmentType, payload.appointment_type_id, hospitalId, 'appointment_type_id');
  }

  if (payload.source_appointment_id) {
    await ensureScopedReference(Appointment, payload.source_appointment_id, hospitalId, 'source_appointment_id');
  }

  const waitlist = await Waitlist.create({
    hospital_id: hospitalId,
    patient_id: payload.patient_id,
    preferred_doctor_id: payload.preferred_doctor_id || null,
    appointment_type_id: payload.appointment_type_id || null,
    desired_date: new Date(payload.desired_date),
    preferred_time_range: payload.preferred_time_range || {},
    reason_for_visit: payload.reason_for_visit || null,
    notes: payload.notes || null,
    priority: payload.priority || 'normal',
    status: 'waiting',
    source_appointment_id: payload.source_appointment_id || null,
    created_by: createdBy,
    is_active: true,
  });

  return Waitlist.findById(waitlist._id).populate(WAITLIST_POPULATE).lean();
}

async function updateWaitlistStatus(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'waitlist id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const waitlist = await Waitlist.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!waitlist) {
    throw new AppError('Waitlist entry not found.', HTTP_STATUS.NOT_FOUND);
  }

  waitlist.status = payload.status;

  if (payload.notes !== undefined) {
    waitlist.notes = payload.notes || null;
  }

  if (payload.status === 'contacted') {
    waitlist.contacted_at = new Date();
    waitlist.contacted_by = actorId;
  }

  if (payload.status === 'expired' || payload.status === 'cancelled') {
    waitlist.is_active = false;
  }

  await waitlist.save();
  return Waitlist.findById(waitlist._id).populate(WAITLIST_POPULATE).lean();
}

module.exports = {
  listAppointments,
  createAppointment,
  getAppointmentDetail,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
  listWaitlist,
  createWaitlist,
  updateWaitlistStatus,
};
