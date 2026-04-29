const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext } = require('../helpers/auth.helper');
const { createPatientViaApi, createConsultationViaApi } = require('../helpers/seed.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Consultations API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  async function payload(ctx) {
    const patient = await createPatientViaApi(app, ctx.adminHeaders);
    return {
      patient_id: patient.body.data._id,
      doctor_id: String(ctx.doctor._id),
      chief_complaint: 'Pain',
      diagnosis: { primary: 'Checkup' },
    };
  }

  test('consultation create/detail success', async () => {
    const ctx = await createAuthContext(app);
    const create = await createConsultationViaApi(app, ctx.doctorHeaders, await payload(ctx));
    expectSuccessResponse(create, 201);
    const detail = await api(app).get(`/api/v1/consultations/${create.body.data._id}`).set(ctx.doctorHeaders);
    expectSuccessResponse(detail, 200);
  });

  test('consultation invalid objectId and receptionist blocked from create', async () => {
    const ctx = await createAuthContext(app);
    const invalid = await api(app).get('/api/v1/consultations/not-a-valid-id').set(ctx.doctorHeaders);
    expectValidationError(invalid);
    const blocked = await createConsultationViaApi(app, ctx.receptionistHeaders, await payload(ctx));
    expectErrorResponse(blocked, 403);
  });
});
