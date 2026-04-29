const supertest = require('supertest');
const app = require('../../src/app');
const { connectTestDatabase, clearDatabase, disconnectTestDatabase } = require('../setup/test-db');
const { api } = require('../helpers/request.helper');
const { createAuthContext, login, PASSWORD } = require('../helpers/auth.helper');
const { expectSuccessResponse, expectErrorResponse, expectValidationError } = require('../helpers/assertion.helper');

describe('Auth API', () => {
  beforeAll(connectTestDatabase);
  beforeEach(clearDatabase);
  afterAll(disconnectTestDatabase);

  test('login success returns access token and user payload', async () => {
    const ctx = await createAuthContext(app);
    const response = await api(app).post('/api/v1/auth/login').send({ email: ctx.admin.email, password: PASSWORD });
    expectSuccessResponse(response, 200);
    expect(response.body.data.access_token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(ctx.admin.email);
  });

  test('login invalid credentials returns unauthorized', async () => {
    const ctx = await createAuthContext(app);
    const response = await api(app).post('/api/v1/auth/login').send({ email: ctx.admin.email, password: 'WrongPass@123' });
    expectErrorResponse(response, 401);
  });

  test('login validation failure returns bad request', async () => {
    const response = await api(app).post('/api/v1/auth/login').send({ email: 'invalid-email', password: 'short' });
    expectValidationError(response);
  });

  test('refresh success rotates session using cookie', async () => {
    const ctx = await createAuthContext(app);
    const agent = supertest.agent(app);
    const loginResponse = await agent.post('/api/v1/auth/login').send({ email: ctx.admin.email, password: PASSWORD });
    expectSuccessResponse(loginResponse, 200);
    const refreshResponse = await agent.post('/api/v1/auth/refresh').send({});
    expectSuccessResponse(refreshResponse, 200);
    expect(refreshResponse.body.data.access_token).toEqual(expect.any(String));
  });

  test('logout success clears session for authenticated user', async () => {
    const ctx = await createAuthContext(app);
    const { token } = await login(app, ctx.admin.email);
    const response = await api(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expectSuccessResponse(response, 200);
  });

  test('change-password success allows relogin with new password', async () => {
    const ctx = await createAuthContext(app);
    const { token } = await login(app, ctx.admin.email);
    const newPassword = 'Changed@12345';
    const changeResponse = await api(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: PASSWORD, new_password: newPassword });
    expectSuccessResponse(changeResponse, 200);
    const oldLoginResponse = await api(app).post('/api/v1/auth/login').send({ email: ctx.admin.email, password: PASSWORD });
    expectErrorResponse(oldLoginResponse, 401);
    const newLoginResponse = await api(app).post('/api/v1/auth/login').send({ email: ctx.admin.email, password: newPassword });
    expectSuccessResponse(newLoginResponse, 200);
  });
});
