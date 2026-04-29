const request = require('supertest');
const app = require('../../src/app');

describe('Runtime smoke hardening', () => {
  test('health includes security headers and request id', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  test('not found response is standardized', async () => {
    const response = await request(app).get('/api/v1/definitely-not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.request_id).toBeDefined();
  });
});
