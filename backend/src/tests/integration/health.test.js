'use strict';

/**
 * GyneCRM – Integration: GET /api/v1/health
 *
 * Tests the health check endpoint exactly as implemented in Batch 2.
 *
 * Locked health response contract:
 *   HTTP 200
 *   {
 *     success : true,
 *     message : string,
 *     data: {
 *       status    : 'ok',
 *       timestamp : ISO-8601 string,
 *       database  : 'connected' | 'disconnected',
 *       uptime    : number   (process.uptime())
 *     }
 *   }
 *
 * The tests use Supertest against the real app.js so that middleware, routing,
 * and error handling are exercised end-to-end.  No business logic modules are
 * imported here.
 */

const request = require('supertest');
const app     = require('../../app');
const { destroyConnection } = require('../../db/connection');

/* ─── Teardown ──────────────────────────────────────────────────────────── */
afterAll(async () => {
  if (db && typeof db.end === 'function') {
    await db.end();
  } else if (db && db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   Happy path
   ══════════════════════════════════════════════════════════════════════════ */

describe('GET /api/v1/health', () => {
  let res;

  beforeAll(async () => {
    res = await request(app).get('/api/v1/health');
  });

  it('responds with HTTP 200', () => {
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', () => {
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('sets success: true in the body', () => {
    expect(res.body.success).toBe(true);
  });

  it('includes a non-empty message string', () => {
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('includes a data object', () => {
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data).toBe('object');
  });

  it('data.status is "ok"', () => {
    expect(res.body.data.status).toBe('ok');
  });

  it('data.timestamp is a valid ISO-8601 string', () => {
    const { timestamp } = res.body.data;
    expect(typeof timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
  });

  it('data.database reports connection state as a string', () => {
    expect(typeof res.body.data.database).toBe('string');
    expect(['connected', 'disconnected']).toContain(res.body.data.database);
  });

  it('data.database is "connected" when the DB pool is healthy', () => {
    // If the test database is reachable, the health route must report connected.
    expect(res.body.data.database).toBe('connected');
  });

  it('data.uptime is a non-negative number', () => {
    const { uptime } = res.body.data;
    expect(typeof uptime).toBe('number');
    expect(uptime).toBeGreaterThanOrEqual(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Route existence – 404 guard
   ══════════════════════════════════════════════════════════════════════════ */

describe('Route guard', () => {
  it('returns 404 for GET /api/v1/healthz (wrong path)', async () => {
    const res = await request(app).get('/api/v1/healthz');
    expect(res.status).toBe(404);
  });

  it('returns 404 for GET /health (missing version prefix)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/health is not allowed (method guard)', async () => {
    const res = await request(app).post('/api/v1/health').send({});
    // Acceptable: 404 (no POST route) or 405 (explicit method-not-allowed)
    expect([404, 405]).toContain(res.status);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Response shape invariants
   ══════════════════════════════════════════════════════════════════════════ */

describe('Response shape invariants', () => {
  it('does not expose internal server details (env, secrets, versions)', async () => {
    const res = await request(app).get('/api/v1/health');
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('secret');
    expect(body).not.toContain('password');
    expect(body).not.toContain('database_url');
  });

  it('does not include a stack trace in the body', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body.data).not.toHaveProperty('stack');
  });
});
