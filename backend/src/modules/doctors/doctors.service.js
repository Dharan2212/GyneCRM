'use strict';

const { db } = require('../../db/connection');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * DOCTORS SERVICE
 * Manages doctor profiles (which extend the users table 1:1)
 * and their doctor_schedule_settings rows.
 * All queries scoped by hospital_id.
 */

// ---------------------------------------------------------------------------
// Column selection
// ---------------------------------------------------------------------------

const DOCTOR_COLUMNS = [
  'doctors.id',
  'doctors.user_id',
  'doctors.hospital_id',
  'doctors.primary_branch_id',
  'doctors.specialisation',
  'doctors.qualification',
  'doctors.registration_number',
  'doctors.consultation_fee',
  'doctors.signature_url',
  'doctors.is_active',
  'doctors.created_at',
  'doctors.updated_at',
  'users.name as doctor_name',
  'users.email as doctor_email',
  'users.phone as doctor_phone',
  'branches.branch_name as primary_branch_name',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const auditLog = (trx, { hospitalId, actorId, action, entityId, meta = {} }) =>
  trx('activity_logs').insert({
    hospital_id: hospitalId,
    user_id: actorId,
    action,
    module: 'doctors',
    entity_id: entityId,
    entity_type: 'doctors',
    meta,
    created_at: new Date(),
  });

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * List doctors — paginated, filterable by branch / is_active / name search.
 */
const listDoctors = async ({ hospitalId, page, limit, branch_id, is_active, search }) => {
  const offset = (page - 1) * limit;

  let query = db('doctors')
    .join('users', 'doctors.user_id', 'users.id')
    .leftJoin('branches', 'doctors.primary_branch_id', 'branches.id')
    .where('doctors.hospital_id', hospitalId)
    .select(DOCTOR_COLUMNS);

  if (branch_id) {
    query = query.where('doctors.primary_branch_id', branch_id);
  }

  if (typeof is_active === 'boolean') {
    query = query.where('doctors.is_active', is_active);
  }

  if (search) {
    query = query.where((qb) =>
      qb
        .whereILike('users.name', `%${search}%`)
        .orWhereILike('doctors.specialisation', `%${search}%`)
    );
  }

  const [{ count }] = await query.clone().count({ count: '*' });
  const doctors = await query
    .orderBy('users.name', 'asc')
    .limit(limit)
    .offset(offset);

  return {
    doctors,
    pagination: {
      total: parseInt(count, 10),
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get a single doctor by their doctors.id, hospital-scoped.
 */
const getDoctorById = async (hospitalId, doctorId) => {
  const doctor = await db('doctors')
    .join('users', 'doctors.user_id', 'users.id')
    .leftJoin('branches', 'doctors.primary_branch_id', 'branches.id')
    .where({ 'doctors.id': doctorId, 'doctors.hospital_id': hospitalId })
    .select(DOCTOR_COLUMNS)
    .first();

  if (!doctor) {
    throw createError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found.');
  }

  return doctor;
};

/**
 * Create a doctor profile.
 * Requires an existing user_id with role = 'doctor' in the same hospital.
 * Enforces 1:1 relationship — a user can only have one doctor profile.
 */
const createDoctor = async (hospitalId, payload, actorId) => {
  const { user_id } = payload;

  // Confirm the user exists in this hospital with role = doctor
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where({ 'users.id': user_id, 'users.hospital_id': hospitalId, 'users.is_deleted': false })
    .first('users.id', 'roles.name as role_name');

  if (!user) {
    throw createError(404, 'USER_NOT_FOUND', 'User not found in this hospital.');
  }

  if (user.role_name !== 'doctor') {
    throw createError(400, 'INVALID_ROLE', 'User must have the doctor role to create a doctor profile.');
  }

  // Check 1:1 constraint
  const existing = await db('doctors')
    .where({ user_id, hospital_id: hospitalId })
    .first('id');

  if (existing) {
    throw createError(409, 'DOCTOR_PROFILE_EXISTS', 'This user already has a doctor profile.');
  }

  const now = new Date();

  const [newDoctor] = await db.transaction(async (trx) => {
    const inserted = await trx('doctors')
      .insert({
        hospital_id: hospitalId,
        user_id,
        primary_branch_id: payload.primary_branch_id || null,
        specialisation: payload.specialisation || null,
        qualification: payload.qualification || null,
        registration_number: payload.registration_number || null,
        consultation_fee: payload.consultation_fee || null,
        signature_url: payload.signature_url || null,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .returning('id');

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'CREATE_DOCTOR',
      entityId: inserted[0].id,
      meta: { user_id },
    });

    return inserted;
  });

  logger.info(`Doctor profile created: ${newDoctor.id} for user ${user_id}`);
  return getDoctorById(hospitalId, newDoctor.id);
};

/**
 * Update a doctor profile.
 */
const updateDoctor = async (hospitalId, doctorId, payload, actorId) => {
  await getDoctorById(hospitalId, doctorId);

  const updates = { updated_at: new Date() };

  const allowedFields = [
    'primary_branch_id',
    'specialisation',
    'qualification',
    'registration_number',
    'consultation_fee',
    'signature_url',
    'is_active',
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field] === '' ? null : payload[field];
    }
  });

  await db.transaction(async (trx) => {
    await trx('doctors').where({ id: doctorId, hospital_id: hospitalId }).update(updates);

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'UPDATE_DOCTOR',
      entityId: doctorId,
      meta: { fields_changed: Object.keys(payload) },
    });
  });

  return getDoctorById(hospitalId, doctorId);
};

/**
 * Get all schedule settings for a doctor.
 * Returns doctor_schedule_settings rows ordered by day.
 */
const getDoctorSchedule = async (hospitalId, doctorId) => {
  // Confirm doctor exists in tenant
  await getDoctorById(hospitalId, doctorId);

  const DAY_ORDER = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 7,
  };

  const schedule = await db('doctor_schedule_settings')
    .where({ doctor_id: doctorId, hospital_id: hospitalId })
    .select(
      'id',
      'day_of_week',
      'start_time',
      'end_time',
      'slot_duration_minutes',
      'buffer_minutes',
      'max_patients',
      'is_active',
      'updated_at'
    );

  // Sort by natural day order
  schedule.sort((a, b) => (DAY_ORDER[a.day_of_week] || 8) - (DAY_ORDER[b.day_of_week] || 8));

  return schedule;
};

/**
 * Upsert a single doctor schedule-settings row (one day of week).
 * Unique constraint: (doctor_id, hospital_id, day_of_week).
 */
const upsertDoctorScheduleDay = async (hospitalId, doctorId, payload, actorId) => {
  await getDoctorById(hospitalId, doctorId);

  const now = new Date();

  await db.raw(
    `INSERT INTO doctor_schedule_settings
       (doctor_id, hospital_id, day_of_week, start_time, end_time,
        slot_duration_minutes, buffer_minutes, max_patients, is_active,
        created_at, updated_at)
     VALUES (:doctor_id, :hospital_id, :day_of_week, :start_time, :end_time,
             :slot_duration_minutes, :buffer_minutes, :max_patients, :is_active,
             :created_at, :updated_at)
     ON CONFLICT (doctor_id, hospital_id, day_of_week)
     DO UPDATE SET
       start_time            = EXCLUDED.start_time,
       end_time              = EXCLUDED.end_time,
       slot_duration_minutes = EXCLUDED.slot_duration_minutes,
       buffer_minutes        = EXCLUDED.buffer_minutes,
       max_patients          = EXCLUDED.max_patients,
       is_active             = EXCLUDED.is_active,
       updated_at            = EXCLUDED.updated_at`,
    {
      doctor_id: doctorId,
      hospital_id: hospitalId,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      slot_duration_minutes: payload.slot_duration_minutes,
      buffer_minutes: payload.buffer_minutes,
      max_patients: payload.max_patients || null,
      is_active: payload.is_active,
      created_at: now,
      updated_at: now,
    }
  );

  await db('activity_logs').insert({
    hospital_id: hospitalId,
    user_id: actorId,
    action: 'UPSERT_DOCTOR_SCHEDULE',
    module: 'doctors',
    entity_id: doctorId,
    entity_type: 'doctor_schedule_settings',
    meta: { day_of_week: payload.day_of_week },
    created_at: now,
  });

  return getDoctorSchedule(hospitalId, doctorId);
};

module.exports = {
  listDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  getDoctorSchedule,
  upsertDoctorScheduleDay,
};
