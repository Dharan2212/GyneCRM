const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext } = require('../helpers/auth.helper');
const { createPatientViaApi, buildPatientPayload } = require('../helpers/seed.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Patients API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  test('patient register and detail success', async () => {
    const ctx = await createAuthContext(app);
    const created = await createPatientViaApi(app, ctx.adminHeaders);
    expectSuccessResponse(created, 201);
    const id = created.body.data._id;
    const detail = await api(app).get(`/api/v1/patients/${id}`).set(ctx.adminHeaders);
    expectSuccessResponse(detail, 200);
  });

  test('patient register validation failure and duplicate handling', async () => {
    const ctx = await createAuthContext(app);
    const bad = await api(app).post('/api/v1/patients').set(ctx.adminHeaders).send({ full_name: 'A', phone: '12' });
    expectValidationError(bad);
    const payload = buildPatientPayload();
    const one = await api(app).post('/api/v1/patients').set(ctx.adminHeaders).send(payload);
    expectSuccessResponse(one, 201);
    const two = await api(app).post('/api/v1/patients').set(ctx.adminHeaders).send(payload);
    expectErrorResponse(two, 409);
  });
});
