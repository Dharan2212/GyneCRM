const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Doctor = require('../../src/models/Doctor');
const AppointmentType = require('../../src/models/AppointmentType');
const TestCatalog = require('../../src/models/TestCatalog');

let sequence = 0;

function nextSequence() {
  sequence += 1;
  return `${Date.now()}${sequence}`;
}

function newObjectId() {
  return new mongoose.Types.ObjectId();
}

function uniqueEmail(prefix = 'user') {
  return `${prefix}.${nextSequence()}@gynecrm.com`;
}

function uniquePhone(prefix = '9') {
  const seq = nextSequence();
  return `${prefix}${seq.slice(-9)}`;
}

async function createUser({
  hospitalId,
  role,
  password = 'Dev@12345',
  email,
  fullName,
  phone,
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    hospital_id: hospitalId,
    email: email || uniqueEmail(role || 'user'),
    password_hash: passwordHash,
    role,
    full_name: fullName || `${role || 'User'} ${sequence}`,
    phone: phone || uniquePhone('9'),
    is_active: true,
  });
}

async function createDoctor({ hospitalId, userId, fullName } = {}) {
  return Doctor.create({
    hospital_id: hospitalId,
    user_id: userId,
    full_name: fullName || 'Test Doctor',
    speciality: 'Gynecology',
    qualification: 'MBBS',
    registration_number: `DOC-${nextSequence().slice(-6)}`,
    schedule_settings: {
      slot_duration_minutes: 15,
      work_windows: [
        {
          day_of_week: 1,
          start_time: '10:00',
          end_time: '13:00',
        },
      ],
    },
    leaves: [],
    schedule_blocks: [],
  });
}

async function createAppointmentType({ hospitalId, code = 'CONSULT', name = 'Consultation' } = {}) {
  return AppointmentType.create({
    hospital_id: hospitalId,
    code,
    name,
    description: 'Test appointment type',
    is_active: true,
  });
}

async function createTestCatalog({ hospitalId, code = 'HB', name = 'Hemoglobin' } = {}) {
  return TestCatalog.create({
    hospital_id: hospitalId,
    code,
    name,
    category: 'lab',
    reference_unit: 'g/dL',
    is_active: true,
  });
}

module.exports = {
  newObjectId,
  uniqueEmail,
  uniquePhone,
  createUser,
  createDoctor,
  createAppointmentType,
  createTestCatalog,
};
