const bcrypt = require('bcryptjs');
const { mongoose } = require('../db/mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

const SALT_ROUNDS = 10;
const DEV_PASSWORD = 'Dev@12345';
const DEV_USERS = [
  {
    email: 'dev.admin@gynecrm.com',
    role: 'admin',
    full_name: 'GyneCRM Dev Admin',
    phoneBase: '9100000000',
  },
  {
    email: 'dev.reception@gynecrm.com',
    role: 'receptionist',
    full_name: 'GyneCRM Dev Reception',
    phoneBase: '9200000000',
  },
  {
    email: 'dev.doctor@gynecrm.com',
    role: 'doctor',
    full_name: 'GyneCRM Dev Doctor',
    phoneBase: '9300000000',
  },
];

function toIdString(value) {
  return value ? String(value) : null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function findExistingUser(email) {
  const usersCollection = mongoose.connection.collection('users');
  const normalizedEmail = normalizeEmail(email);

  return usersCollection.findOne({
    $or: [
      { email: normalizedEmail },
      { useremail: normalizedEmail },
    ],
  });
}

async function findAvailablePhone(phoneBase, existingId = null) {
  const usersCollection = mongoose.connection.collection('users');
  const base = Number(phoneBase);

  for (let offset = 0; offset < 500; offset += 1) {
    const phone = String(base + offset);
    const filter = {
      $or: [
        { phone },
        { Phone_number: phone },
      ],
    };

    if (existingId) {
      filter._id = { $ne: existingId };
    }

    const collision = await usersCollection.findOne(filter, { projection: { _id: 1 } });
    if (!collision) {
      return phone;
    }
  }

  throw new Error(`Unable to allocate a collision-safe phone for base ${phoneBase}.`);
}

async function ensureDevUser(hospitalId, spec, password = DEV_PASSWORD) {
  const usersCollection = mongoose.connection.collection('users');
  const existing = await findExistingUser(spec.email);
  const passwordHash = await hashPassword(password);
  const phone = await findAvailablePhone(spec.phoneBase, existing?._id || null);
  const email = normalizeEmail(spec.email);
  const now = new Date();

  const baseSet = {
    hospital_id: hospitalId,
    email,
    useremail: email,
    password_hash: passwordHash,
    role: spec.role,
    full_name: spec.full_name,
    phone,
    Phone_number: phone,
    is_active: true,
    is_locked: false,
    failed_login_attempts: 0,
    lockout_until: null,
    refresh_token_hash: null,
    updatedAt: now,
  };

  if (!existing) {
    const doc = {
      ...baseSet,
      createdAt: now,
    };

    const result = await usersCollection.insertOne(doc);

    return {
      action: 'created',
      id: result.insertedId,
      email,
      role: spec.role,
      hospital_id: hospitalId,
      phone,
    };
  }

  await usersCollection.updateOne(
    { _id: existing._id },
    {
      $set: baseSet,
    },
  );

  return {
    action: 'updated',
    id: existing._id,
    email,
    role: spec.role,
    hospital_id: hospitalId,
    phone,
  };
}

async function resolveHospitalContext() {
  const doctorRecord = await Doctor.findOne({ hospital_id: { $ne: null } })
    .sort({ createdAt: 1, _id: 1 })
    .select({ hospital_id: 1, user_id: 1 })
    .lean();

  if (doctorRecord?.hospital_id) {
    return {
      hospitalId: doctorRecord.hospital_id,
      source: 'doctor_record',
      bootstrapped: false,
    };
  }

  const patientRecord = await Patient.findOne({ hospital_id: { $ne: null }, is_deleted: false })
    .sort({ createdAt: 1, _id: 1 })
    .select({ hospital_id: 1 })
    .lean();

  if (patientRecord?.hospital_id) {
    return {
      hospitalId: patientRecord.hospital_id,
      source: 'patient_record',
      bootstrapped: false,
    };
  }

  const anyUser = await User.findOne({ hospital_id: { $ne: null } })
    .sort({ createdAt: 1, _id: 1 })
    .select({ hospital_id: 1 })
    .lean();

  if (anyUser?.hospital_id) {
    return {
      hospitalId: anyUser.hospital_id,
      source: 'user_record',
      bootstrapped: false,
    };
  }

  return {
    hospitalId: new mongoose.Types.ObjectId(),
    source: 'bootstrap_generated',
    bootstrapped: true,
  };
}

async function ensureDoctorRecord(hospitalId, doctorUser) {
  const existingDoctor = await Doctor.findOne({ user_id: doctorUser.id || doctorUser._id }).lean();

  if (existingDoctor) {
    return {
      action: 'existing',
      id: existingDoctor._id,
      linked_user_id: doctorUser.id || doctorUser._id,
      note: 'Sample doctor record already exists for the canonical dev doctor user.',
    };
  }

  const userId = doctorUser.id || doctorUser._id;
  const registrationNumber = `DEV-DOC-${String(userId).slice(-6).toUpperCase()}`;
  const registrationConflict = await Doctor.exists({
    hospital_id: hospitalId,
    registration_number: registrationNumber,
  });

  const payload = {
    user_id: userId,
    hospital_id: hospitalId,
    full_name: doctorUser.full_name || 'GyneCRM Dev Doctor',
    speciality: 'Gynecology',
    qualification: 'MBBS, DGO',
    schedule_settings: {
      slot_duration_minutes: 15,
      work_windows: [
        { day_of_week: 1, start_time: '10:00', end_time: '13:00' },
        { day_of_week: 3, start_time: '10:00', end_time: '13:00' },
        { day_of_week: 5, start_time: '10:00', end_time: '13:00' },
      ],
    },
    leaves: [],
    schedule_blocks: [],
  };

  if (!registrationConflict) {
    payload.registration_number = registrationNumber;
  }

  const createdDoctor = await Doctor.create(payload);
  return {
    action: 'created',
    id: createdDoctor._id,
    linked_user_id: userId,
    note: registrationConflict
      ? 'Sample doctor record created without registration_number because the derived value was already in use.'
      : 'Sample doctor record created for the canonical dev doctor user.',
  };
}

module.exports = {
  DEV_PASSWORD,
  DEV_USERS,
  toIdString,
  normalizeEmail,
  ensureDevUser,
  ensureDoctorRecord,
  resolveHospitalContext,
};
