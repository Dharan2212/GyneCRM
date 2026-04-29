const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext } = require('../helpers/auth.helper');
const { createPatientViaApi, createAppointmentViaApi } = require('../helpers/seed.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Appointments API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  async function prepareAppointmentPayload(ctx, overrides = {}) {
    const patientResponse = await createPatientViaApi(app, ctx.adminHeaders);
    const patientId = patientResponse.body.data._id;

    return {
      patient_id: patientId,
      doctor_id: String(ctx.doctor._id),
      appointment_type_id: String(ctx.appointmentType._id),
      scheduled_at: '2030-01-01T10:00:00.000Z',
      duration_minutes: 20,
      visit_type: 'new',
      reason_for_visit: 'Routine visit',
      ...overrides,
    };
  }

  test('appointment create success and list/detail success', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx);

    const createResponse = await createAppointmentViaApi(app, ctx.receptionistHeaders, payload);
    expectSuccessResponse(createResponse, 201);
    const appointmentId = createResponse.body.data._id;

    const listResponse = await api(app).get('/api/v1/appointments').set(ctx.adminHeaders);
    expectSuccessResponse(listResponse, 200);
    expect(Array.isArray(listResponse.body.data)).toBe(true);

    const detailResponse = await api(app).get(`/api/v1/appointments/${appointmentId}`).set(ctx.adminHeaders);
    expectSuccessResponse(detailResponse, 200);
    expect(detailResponse.body.data._id).toBe(appointmentId);
  });

  test('appointment create validation failure and invalid ObjectId failure', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx, { scheduled_at: 'bad-date' });

    const createResponse = await createAppointmentViaApi(app, ctx.receptionistHeaders, payload);
    expectValidationError(createResponse);

    const detailResponse = await api(app)
      .get('/api/v1/appointments/not-a-valid-id')
      .set(ctx.adminHeaders);
    expectValidationError(detailResponse);
  });

  test('appointment status update success', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx, { scheduled_at: '2030-01-01T11:00:00.000Z' });
    const createResponse = await createAppointmentViaApi(app, ctx.adminHeaders, payload);
    const appointmentId = createResponse.body.data._id;

    const statusResponse = await api(app)
      .patch(`/api/v1/appointments/${appointmentId}/status`)
      .set(ctx.receptionistHeaders)
      .send({ status: 'cancelled', cancellation_reason: 'Patient cancelled' });

    expectSuccessResponse(statusResponse, 200);
    expect(statusResponse.body.data.status).toBe('cancelled');
  });

  test('appointment check-in success', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx, { scheduled_at: '2030-01-01T12:00:00.000Z' });
    const createResponse = await createAppointmentViaApi(app, ctx.adminHeaders, payload);
    const appointmentId = createResponse.body.data._id;

    const response = await api(app)
      .patch(`/api/v1/appointments/${appointmentId}/check-in`)
      .set(ctx.receptionistHeaders)
      .send({});

    expectSuccessResponse(response, 200);
    expect(response.body.data.status).toBe('checked_in');
  });

  test('appointment reschedule success', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx, { scheduled_at: '2030-01-01T13:00:00.000Z' });
    const createResponse = await createAppointmentViaApi(app, ctx.adminHeaders, payload);
    const appointmentId = createResponse.body.data._id;

    const response = await api(app)
      .patch(`/api/v1/appointments/${appointmentId}/reschedule`)
      .set(ctx.receptionistHeaders)
      .send({
        scheduled_at: '2030-01-02T13:00:00.000Z',
        duration_minutes: 25,
        reschedule_reason: 'Doctor request',
      });

    expectSuccessResponse(response, 200);
    expect(response.body.data.status).toBe('rescheduled');
  });

  test('duplicate/conflict rule blocks same doctor and scheduled_at', async () => {
    const ctx = await createAuthContext(app);
    const firstPayload = await prepareAppointmentPayload(ctx, { scheduled_at: '2030-01-01T14:00:00.000Z' });
    const secondPayload = { ...firstPayload };

    const first = await createAppointmentViaApi(app, ctx.adminHeaders, firstPayload);
    expectSuccessResponse(first, 201);

    const second = await createAppointmentViaApi(app, ctx.adminHeaders, secondPayload);
    expectErrorResponse(second, 409);
  });

  test('doctor is blocked from receptionist/admin write routes', async () => {
    const ctx = await createAuthContext(app);
    const payload = await prepareAppointmentPayload(ctx, { scheduled_at: '2030-01-01T15:00:00.000Z' });

    const createResponse = await createAppointmentViaApi(app, ctx.doctorHeaders, payload);
    expectErrorResponse(createResponse, 403);
  });
});
