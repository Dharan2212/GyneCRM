const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext } = require('../helpers/auth.helper');
const { createPatientViaApi, createConsultationViaApi, createInvoiceViaApi } = require('../helpers/seed.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Billing API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  async function payload(ctx) {
    const patient = await createPatientViaApi(app, ctx.adminHeaders);
    const consultation = await createConsultationViaApi(app, ctx.doctorHeaders, {
      patient_id: patient.body.data._id,
      doctor_id: String(ctx.doctor._id),
      chief_complaint: 'Billing consultation',
      diagnosis: { primary: 'Review' },
    });
    return {
      patient_id: patient.body.data._id,
      doctor_id: String(ctx.doctor._id),
      consultation_id: consultation.body.data._id,
      invoice_date: '2030-03-01T00:00:00.000Z',
      due_date: '2030-03-05T00:00:00.000Z',
      currency: 'INR',
      items: [{ item_type: 'consultation', label: 'Consultation Fee', quantity: 1, unit_price: 500, discount_amount: 50, tax_amount: 25, status: 'active' }],
    };
  }

  test('invoice create/list/detail success', async () => {
    const ctx = await createAuthContext(app);
    const create = await createInvoiceViaApi(app, ctx.receptionistHeaders, await payload(ctx));
    expectSuccessResponse(create, 201);
    const list = await api(app).get('/api/v1/billing/invoices').set(ctx.adminHeaders);
    expectSuccessResponse(list, 200);
    const detail = await api(app).get(`/api/v1/billing/invoices/${create.body.data._id}`).set(ctx.adminHeaders);
    expectSuccessResponse(detail, 200);
  });

  test('billing invalid objectId and doctor blocked from create', async () => {
    const ctx = await createAuthContext(app);
    const invalid = await api(app).get('/api/v1/billing/invoices/not-a-valid-id').set(ctx.adminHeaders);
    expectValidationError(invalid);
    const blocked = await createInvoiceViaApi(app, ctx.doctorHeaders, await payload(ctx));
    expectErrorResponse(blocked, 403);
  });
});
