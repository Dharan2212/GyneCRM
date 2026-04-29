const mongoose = require('mongoose');
const Counter = require('../../models/Counter');
const Patient = require('../../models/Patient');
const PatientCategoryHistory = require('../../models/PatientCategoryHistory');
const Appointment = require('../../models/Appointment');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');
const {
  normalizePagination,
  normalizePhone,
  buildLoosePhoneRegex,
  resolveHospitalId,
  buildPatientFilter,
} = require('./patients.query');
const { buildPatientHub } = require('./patients.hub');

const CATEGORY_ENUM = ['pregnancy', 'ivf', 'gynac', 'uncategorized'];
const DUPLICATE_CONTACT_FIELDS = ['phone', 'alternate_phone', 'family_whatsapp'];

async function getNextPatientCode(hospitalId, session = null) {
  const counterKey = `patient_code:${hospitalId}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  );

  return `PAT${String(counter.value).padStart(6, '0')}`;
}

function normalizeContactValue(value) {
  const normalized = normalizePhone(value);
  return normalized || null;
}

function normalizeNullableString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return value;
}

function normalizeStringArrayField(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeNullableString(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const normalized = normalizeNullableString(value);
    return normalized ? [normalized] : [];
  }

  return value;
}

function normalizeAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    return address;
  }

  return {
    ...address,
    line_1: normalizeNullableString(address.line_1),
    line_2: normalizeNullableString(address.line_2),
    area: normalizeNullableString(address.area),
    city: normalizeNullableString(address.city),
    state: normalizeNullableString(address.state),
    postal_code: normalizeNullableString(address.postal_code),
    country: normalizeNullableString(address.country),
  };
}

function normalizeEmergencyContact(emergencyContact) {
  if (!emergencyContact || typeof emergencyContact !== 'object' || Array.isArray(emergencyContact)) {
    return emergencyContact;
  }

  return {
    ...emergencyContact,
    name: normalizeNullableString(emergencyContact.name),
    relation: normalizeNullableString(emergencyContact.relation),
    phone: normalizeContactValue(emergencyContact.phone),
  };
}

function normalizeMedicalHistory(medicalHistory) {
  if (!medicalHistory || typeof medicalHistory !== 'object' || Array.isArray(medicalHistory)) {
    return medicalHistory;
  }

  return {
    ...medicalHistory,
    existing_conditions: normalizeStringArrayField(medicalHistory.existing_conditions),
    surgical_history: normalizeNullableString(medicalHistory.surgical_history),
    allergies: normalizeStringArrayField(medicalHistory.allergies),
    current_medications: normalizeStringArrayField(medicalHistory.current_medications),
    family_history: normalizeNullableString(medicalHistory.family_history),
    notes: normalizeNullableString(medicalHistory.notes),
  };
}

function normalizeConsents(consents) {
  if (!Array.isArray(consents)) {
    return consents;
  }

  return consents.map((consent) => ({
    ...consent,
    consent_type: normalizeNullableString(consent?.consent_type),
    status: normalizeNullableString(consent?.status),
    notes: normalizeNullableString(consent?.notes),
    recorded_by: consent?.recorded_by || null,
  }));
}

function normalizePatientPayload(payload = {}) {
  const normalized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(normalized, 'full_name')) {
    normalized.full_name = normalizeNullableString(normalized.full_name);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'phone')) {
    normalized.phone = normalizeContactValue(normalized.phone);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'alternate_phone')) {
    normalized.alternate_phone = normalizeContactValue(normalized.alternate_phone);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'family_whatsapp')) {
    normalized.family_whatsapp = normalizeContactValue(normalized.family_whatsapp);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'blood_group')) {
    normalized.blood_group = normalizeNullableString(normalized.blood_group);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'category')) {
    normalized.category = normalizeNullableString(normalized.category) || 'uncategorized';
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'address')) {
    normalized.address = normalizeAddress(normalized.address);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'emergency_contact')) {
    normalized.emergency_contact = normalizeEmergencyContact(normalized.emergency_contact);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'medical_history')) {
    normalized.medical_history = normalizeMedicalHistory(normalized.medical_history);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'consents')) {
    normalized.consents = normalizeConsents(normalized.consents);
  }

  return normalized;
}

function buildDuplicateContactQuery(contactValues = {}) {
  const orConditions = [];

  DUPLICATE_CONTACT_FIELDS.forEach((inputField) => {
    const normalized = normalizeContactValue(contactValues[inputField]);

    if (!normalized) {
      return;
    }

    const regex = buildLoosePhoneRegex(normalized);

    if (!regex) {
      return;
    }

    DUPLICATE_CONTACT_FIELDS.forEach((storedField) => {
      orConditions.push({ [storedField]: regex });
    });
  });

  return orConditions;
}

function buildDuplicateError(existingPatient, attemptedValues = {}) {
  const existingContacts = DUPLICATE_CONTACT_FIELDS.reduce((acc, field) => {
    const normalized = normalizeContactValue(existingPatient?.[field]);

    if (normalized) {
      acc[field] = normalized;
    }

    return acc;
  }, {});

  const matchedField = DUPLICATE_CONTACT_FIELDS.find((inputField) => {
    const normalized = normalizeContactValue(attemptedValues[inputField]);

    if (!normalized) {
      return false;
    }

    return Object.values(existingContacts).includes(normalized);
  }) || 'phone';

  return new AppError(
    `Patient contact already exists for ${matchedField}.`,
    HTTP_STATUS.CONFLICT,
    {
      details: {
        field: matchedField,
        patient_id: existingPatient?._id || null,
      },
    },
  );
}

async function ensureNoDuplicatePatientContacts({ hospitalId, payload = {}, excludePatientId = null, session = null }) {
  const duplicateContactQuery = buildDuplicateContactQuery(payload);

  if (duplicateContactQuery.length === 0) {
    return;
  }

  const duplicateFilter = {
    hospital_id: hospitalId,
    is_deleted: false,
    $or: duplicateContactQuery,
  };

  if (excludePatientId) {
    duplicateFilter._id = { $ne: excludePatientId };
  }

  const existingPatient = await Patient.findOne(duplicateFilter)
    .select('_id phone alternate_phone family_whatsapp')
    .session(session || null)
    .lean();

  if (existingPatient) {
    throw buildDuplicateError(existingPatient, payload);
  }
}

async function createPatientWithGeneratedCode(basePayload, hospitalId) {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const patientCode = await getNextPatientCode(hospitalId);

    try {
      const patient = await Patient.create({
        ...basePayload,
        hospital_id: hospitalId,
        patient_code: patientCode,
      });

      return patient.toObject();
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.patient_code) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError('Unable to generate a unique patient_code.', HTTP_STATUS.CONFLICT);
}

async function listPatients(query = {}, currentUser = {}) {
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildPatientFilter(query, currentUser);

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return {
    patients,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function registerPatient(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const registeredBy = currentUser.id || payload.registered_by;

  if (!registeredBy) {
    throw new AppError('registered_by is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(registeredBy, 'registered_by');

  const createPayload = {
    ...normalizePatientPayload(payload),
    registered_by: registeredBy,
    category: payload.category || 'uncategorized',
  };

  await ensureNoDuplicatePatientContacts({
    hospitalId,
    payload: createPayload,
  });

  return createPatientWithGeneratedCode(createPayload, hospitalId);
}

async function getPatientDetail(id, currentUser = {}) {
  assertObjectId(id, 'patient id');

  const filter = {
    _id: id,
    hospital_id: resolveHospitalId(null, currentUser),
    is_deleted: false,
  };

  const patient = await Patient.findOne(filter).lean();

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  return patient;
}

async function updatePatient(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'patient id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const filter = {
    _id: id,
    hospital_id: hospitalId,
    is_deleted: false,
  };

  const existingPatient = await Patient.findOne(filter).lean();

  if (!existingPatient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updatePayload = normalizePatientPayload(payload);
  delete updatePayload.category;
  delete updatePayload.patient_code;
  delete updatePayload.hospital_id;
  delete updatePayload.registered_by;
  delete updatePayload.is_deleted;
  delete updatePayload.deleted_at;
  delete updatePayload.deleted_by;

  await ensureNoDuplicatePatientContacts({
    hospitalId,
    payload: {
      phone: updatePayload.phone !== undefined ? updatePayload.phone : existingPatient.phone,
      alternate_phone:
        updatePayload.alternate_phone !== undefined
          ? updatePayload.alternate_phone
          : existingPatient.alternate_phone,
      family_whatsapp:
        updatePayload.family_whatsapp !== undefined
          ? updatePayload.family_whatsapp
          : existingPatient.family_whatsapp,
    },
    excludePatientId: existingPatient._id,
  });

  const patient = await Patient.findOneAndUpdate(
    filter,
    { $set: updatePayload },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  return patient;
}

async function updatePatientCategory(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'patient id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const changedBy = currentUser.id;

  if (!changedBy || !isValidObjectId(changedBy)) {
    throw new AppError('changed_by is required for category update.', HTTP_STATUS.BAD_REQUEST);
  }

  const session = await mongoose.startSession();

  try {
    let updatedPatient = null;

    await session.withTransaction(async () => {
      const patient = await Patient.findOne({
        _id: id,
        hospital_id: hospitalId,
        is_deleted: false,
      }).session(session);

      if (!patient) {
        throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
      }

      const previousCategory = patient.category || 'uncategorized';
      const nextCategory = payload.category;

      if (!CATEGORY_ENUM.includes(nextCategory)) {
        throw new AppError('Invalid patient category.', HTTP_STATUS.BAD_REQUEST);
      }

      if (previousCategory !== nextCategory) {
        patient.category = nextCategory;
        await patient.save({ session, validateBeforeSave: true });

        await PatientCategoryHistory.create(
          [
            {
              patient_id: patient._id,
              hospital_id: patient.hospital_id,
              previous_category: previousCategory,
              new_category: nextCategory,
              changed_by: changedBy,
              reason: payload.reason || null,
              changed_at: new Date(),
            },
          ],
          { session },
        );
      }

      updatedPatient = patient.toObject();
    });

    return updatedPatient;
  } finally {
    await session.endSession();
  }
}

async function getPatientCategoryHistory(id, currentUser = {}) {
  assertObjectId(id, 'patient id');

  const hospitalId = resolveHospitalId(null, currentUser);

  const patientExists = await Patient.exists({
    _id: id,
    hospital_id: hospitalId,
    is_deleted: false,
  });

  if (!patientExists) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  return PatientCategoryHistory.find({
    patient_id: id,
    hospital_id: hospitalId,
  })
    .sort({ changed_at: -1, createdAt: -1, _id: -1 })
    .lean();
}


async function getPatientHub(id, currentUser = {}) {
  assertObjectId(id, 'patient id');

  const hospitalId = resolveHospitalId(null, currentUser);
  const patientFilter = {
    _id: id,
    hospital_id: hospitalId,
    is_deleted: false,
  };

  const patient = await Patient.findOne(patientFilter).lean();

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const [categoryHistory, recentAppointments] = await Promise.all([
    PatientCategoryHistory.find({
      patient_id: id,
      hospital_id: hospitalId,
    })
      .sort({ changed_at: -1, createdAt: -1, _id: -1 })
      .limit(10)
      .lean(),
    Appointment.find({
      patient_id: id,
      hospital_id: hospitalId,
      is_active: true,
    })
      .sort({ scheduled_at: -1, _id: -1 })
      .limit(5)
      .lean(),
  ]);

  return buildPatientHub(patient, categoryHistory, recentAppointments);
}

async function getPatientCategoryCounts(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);

  if (!isValidObjectId(hospitalId)) {
    throw new AppError('Valid hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const filter = {
    hospital_id: new mongoose.Types.ObjectId(hospitalId),
    is_deleted: false,
  };

  if (query.is_active !== undefined) {
    filter.is_active = query.is_active;
  }

  const rows = await Patient.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = CATEGORY_ENUM.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  rows.forEach((row) => {
    if (row && row._id && Object.prototype.hasOwnProperty.call(counts, row._id)) {
      counts[row._id] = row.count;
    }
  });

  return {
    counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
  };
}

module.exports = {
  listPatients,
  registerPatient,
  getPatientDetail,
  updatePatient,
  updatePatientCategory,
  getPatientCategoryHistory,
  getPatientHub,
  getPatientCategoryCounts,
};
