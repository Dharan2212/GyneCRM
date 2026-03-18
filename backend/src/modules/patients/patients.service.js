'use strict';

const { db } = require('../../db/connection');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * PATIENTS SERVICE
 *
 * Architecture rules enforced here:
 *  - hospital_id scoping on every query
 *  - patient_code auto-generated: PAT-YYYYMM-NNNNN
 *  - phone uniqueness per hospital
 *  - is_deleted soft-delete only — never hard-delete
 *  - deleted_reason required on delete
 *  - activity_logs appended for create / update / delete
 *  - patient_medical_history created alongside patient (1:1)
 */

// ---------------------------------------------------------------------------
// Column selection
// ---------------------------------------------------------------------------

const PATIENT_COLUMNS = [
  'patients.id',
  'patients.hospital_id',
  'patients.patient_code',
  'patients.full_name',
  'patients.phone',
  'patients.date_of_birth',
  'patients.blood_group',
  'patients.address',
  'patients.emergency_contact_name',
  'patients.emergency_contact_phone',
  'patients.family_whatsapp',
  'patients.registered_by',
  'patients.is_active',
  'patients.is_deleted',
  'patients.created_at',
  'patients.updated_at',
  'users.name as registered_by_name',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const auditLog = (trx, { hospitalId, actorId, action, entityId, meta = {} }) =>
  trx('activity_logs').insert({
    hospital_id: hospitalId,
    user_id: actorId,
    action,
    module: 'patients',
    entity_id: entityId,
    entity_type: 'patients',
    meta,
    created_at: new Date(),
  });

/**
 * Generate the next patient_code for a hospital.
 * Format: PAT-YYYYMM-NNNNN
 * Uses a COUNT of existing codes for this hospital+month as the sequence.
 * Executed inside the caller's transaction to prevent race conditions.
 */
const generatePatientCode = async (trx, hospitalId) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PAT-${yyyy}${mm}-`;

  const [{ count }] = await trx('patients')
    .where('hospital_id', hospitalId)
    .whereILike('patient_code', `${prefix}%`)
    .count({ count: '*' });

  const seq = String(parseInt(count, 10) + 1).padStart(5, '0');
  return `${prefix}${seq}`;
};

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * List / search patients.
 * Primary search: exact phone match (architecture rule).
 * Secondary: ILIKE on full_name.
 * Excludes soft-deleted records from all queries.
 */
const listPatients = async ({ hospitalId, page, limit, phone, search, is_active, blood_group }) => {
  const offset = (page - 1) * limit;

  let query = db('patients')
    .leftJoin('users', 'patients.registered_by', 'users.id')
    .where({ 'patients.hospital_id': hospitalId, 'patients.is_deleted': false })
    .select(PATIENT_COLUMNS);

  // Exact phone lookup takes precedence — primary search key per architecture
  if (phone) {
    query = query.where('patients.phone', phone);
  } else if (search) {
    query = query.where((qb) =>
      qb
        .whereILike('patients.full_name', `%${search}%`)
        .orWhereILike('patients.phone', `%${search}%`)
        .orWhereILike('patients.patient_code', `%${search}%`)
    );
  }

  if (typeof is_active === 'boolean') {
    query = query.where('patients.is_active', is_active);
  }

  if (blood_group) {
    query = query.where('patients.blood_group', blood_group);
  }

  const [{ count }] = await query.clone().count({ count: '*' });
  const patients = await query
    .orderBy('patients.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    patients,
    pagination: {
      total: parseInt(count, 10),
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get a single patient by ID.
 * Joins patient_medical_history (1:1) so the profile is complete.
 */
const getPatientById = async (hospitalId, patientId) => {
  const patient = await db('patients')
    .leftJoin('users', 'patients.registered_by', 'users.id')
    .where({
      'patients.id': patientId,
      'patients.hospital_id': hospitalId,
      'patients.is_deleted': false,
    })
    .select(PATIENT_COLUMNS)
    .first();

  if (!patient) {
    throw createError(404, 'PATIENT_NOT_FOUND', 'Patient not found.');
  }

  // Attach medical history if it exists (1:1, may be absent for very new patients)
  const history = await db('patient_medical_history')
    .where({ patient_id: patientId, hospital_id: hospitalId })
    .first(
      'id',
      'allergies',
      'existing_conditions',
      'surgical_history',
      'family_history',
      'current_medications',
      'notes',
      'updated_at'
    );

  patient.medical_history = history || null;

  return patient;
};

/**
 * Create a new patient.
 * Enforces phone uniqueness per hospital.
 * Auto-generates patient_code.
 * Creates an empty patient_medical_history row (1:1 seeded empty).
 */
const createPatient = async (hospitalId, payload, actorId) => {
  // Phone uniqueness check within tenant
  const existing = await db('patients')
    .where({ hospital_id: hospitalId, phone: payload.phone, is_deleted: false })
    .first('id', 'patient_code', 'full_name');

  if (existing) {
    throw createError(409, 'PHONE_TAKEN', `Phone number is already registered to patient ${existing.patient_code} — ${existing.full_name}.`);
  }

  const now = new Date();

  const newPatient = await db.transaction(async (trx) => {
    const patientCode = await generatePatientCode(trx, hospitalId);

    const [inserted] = await trx('patients')
      .insert({
        hospital_id: hospitalId,
        patient_code: patientCode,
        full_name: payload.full_name,
        phone: payload.phone,
        date_of_birth: payload.date_of_birth || null,
        blood_group: payload.blood_group || null,
        address: payload.address || null,
        emergency_contact_name: payload.emergency_contact_name || null,
        emergency_contact_phone: payload.emergency_contact_phone || null,
        family_whatsapp: payload.family_whatsapp || null,
        registered_by: actorId,
        is_active: true,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      })
      .returning('id');

    // Seed empty medical history record (1:1 mandatory join for profile screen)
    await trx('patient_medical_history').insert({
      patient_id: inserted.id,
      hospital_id: hospitalId,
      allergies: JSON.stringify([]),
      existing_conditions: JSON.stringify([]),
      surgical_history: JSON.stringify([]),
      family_history: JSON.stringify([]),
      current_medications: JSON.stringify([]),
      notes: null,
      created_at: now,
      updated_at: now,
    });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'CREATE_PATIENT',
      entityId: inserted.id,
      meta: { patient_code: patientCode, phone: payload.phone },
    });

    return inserted;
  });

  logger.info(`Patient created: ${newPatient.id} (${newPatient.patient_code || ''}) by user ${actorId}`);
  return getPatientById(hospitalId, newPatient.id);
};

/**
 * Update an existing patient record.
 * Phone change re-validates uniqueness within tenant.
 */
const updatePatient = async (hospitalId, patientId, payload, actorId) => {
  await getPatientById(hospitalId, patientId);

  const updates = { updated_at: new Date() };

  const directFields = [
    'full_name',
    'date_of_birth',
    'blood_group',
    'address',
    'emergency_contact_name',
    'emergency_contact_phone',
    'family_whatsapp',
    'is_active',
  ];

  directFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field] === '' ? null : payload[field];
    }
  });

  if (payload.phone) {
    const conflict = await db('patients')
      .where({ hospital_id: hospitalId, phone: payload.phone, is_deleted: false })
      .whereNot({ id: patientId })
      .first('id', 'patient_code');

    if (conflict) {
      throw createError(409, 'PHONE_TAKEN', `Phone number already registered to patient ${conflict.patient_code}.`);
    }
    updates.phone = payload.phone;
  }

  await db.transaction(async (trx) => {
    await trx('patients')
      .where({ id: patientId, hospital_id: hospitalId })
      .update(updates);

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'UPDATE_PATIENT',
      entityId: patientId,
      meta: { fields_changed: Object.keys(payload) },
    });
  });

  return getPatientById(hospitalId, patientId);
};

/**
 * Soft-delete a patient.
 * Architecture mandate: NO hard deletes on clinical records.
 * Sets is_deleted = true, records deleted_at, deleted_by, deleted_reason.
 * Requires a reason string.
 */
const softDeletePatient = async (hospitalId, patientId, reason, actorId) => {
  const patient = await getPatientById(hospitalId, patientId);

  if (patient.is_deleted) {
    throw createError(409, 'ALREADY_DELETED', 'Patient record is already deleted.');
  }

  const now = new Date();

  await db.transaction(async (trx) => {
    await trx('patients')
      .where({ id: patientId, hospital_id: hospitalId })
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: now,
        deleted_by: actorId,
        deleted_reason: reason,
        updated_at: now,
      });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'SOFT_DELETE_PATIENT',
      entityId: patientId,
      meta: { reason, patient_code: patient.patient_code },
    });
  });

  logger.info(`Patient soft-deleted: ${patientId} by user ${actorId}. Reason: ${reason}`);
  return { id: patientId, patient_code: patient.patient_code, deleted: true };
};

module.exports = {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  softDeletePatient,
};
