const { api } = require('./request.helper');

function buildPatientPayload(overrides = {}) {
  const uniqueSeed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    full_name: `Test Patient ${uniqueSeed}`,
    date_of_birth: '1995-05-21T00:00:00.000Z',
    phone: `9${uniqueSeed.slice(-9)}`,
    alternate_phone: `8${uniqueSeed.slice(-9)}`,
    blood_group: 'O+',
    family_whatsapp: `7${uniqueSeed.slice(-9)}`,
    address: {
      line_1: 'Street 1',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600001',
    },
    emergency_contact: {
      name: 'Emergency Contact',
      relation: 'Spouse',
      phone: `6${uniqueSeed.slice(-9)}`,
    },
    medical_history: {
      allergies: ['Dust'],
      current_medications: ['Paracetamol'],
      surgical_history: 'None',
      notes: 'Test seed',
    },
    ...overrides,
  };
}

async function createPatientViaApi(app, headers, overrides = {}) {
  return api(app)
    .post('/api/v1/patients')
    .set(headers)
    .send(buildPatientPayload(overrides));
}

async function createConsultationViaApi(app, headers, payload = {}) {
  return api(app)
    .post('/api/v1/consultations')
    .set(headers)
    .send(payload);
}

async function createAppointmentViaApi(app, headers, payload = {}) {
  return api(app)
    .post('/api/v1/appointments')
    .set(headers)
    .send(payload);
}

async function createInvoiceViaApi(app, headers, payload = {}) {
  return api(app)
    .post('/api/v1/billing/invoices')
    .set(headers)
    .send(payload);
}

async function createTestOrderViaApi(app, headers, payload = {}) {
  return api(app)
    .post('/api/v1/test-orders')
    .set(headers)
    .send(payload);
}

module.exports = {
  buildPatientPayload,
  createPatientViaApi,
  createConsultationViaApi,
  createAppointmentViaApi,
  createInvoiceViaApi,
  createTestOrderViaApi,
};
