const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext } = require('../helpers/auth.helper');
const { createPatientViaApi, createConsultationViaApi, createTestOrderViaApi } = require('../helpers/seed.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Test Orders / Documents API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  async function payload(ctx) {
    const patient = await createPatientViaApi(app, ctx.adminHeaders);
    const consultation = await createConsultationViaApi(app, ctx.doctorHeaders, {
      patient_id: patient.body.data._id,
      doctor_id: String(ctx.doctor._id),
      chief_complaint: 'Need test order',
      diagnosis: { primary: 'Screening' },
    });
    return {
      patient_id: patient.body.data._id,
      doctor_id: String(ctx.doctor._id),
      consultation_id: consultation.body.data._id,
      test_catalog_id: String(ctx.testCatalog._id),
      priority: 'urgent',
      clinical_notes: 'Order for test flow',
    };
  }

  test('test-order create and review inbox success', async () => {
    const ctx = await createAuthContext(app);
    const create = await createTestOrderViaApi(app, ctx.doctorHeaders, await payload(ctx));
    expectSuccessResponse(create, 201);
    const inbox = await api(app).get('/api/v1/test-orders/review-inbox').set(ctx.doctorHeaders);
    expectSuccessResponse(inbox, 200);
  });

  test('test-order invalid objectId and receptionist blocked from create', async () => {
    const ctx = await createAuthContext(app);
    const invalid = await api(app).patch('/api/v1/test-orders/not-a-valid-id/pending-upload').set(ctx.doctorHeaders).send({});
    expectValidationError(invalid);
    const blocked = await createTestOrderViaApi(app, ctx.receptionistHeaders, await payload(ctx));
    expectErrorResponse(blocked, 403);
  });
});
