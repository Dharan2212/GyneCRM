'use strict';

/**
 * GyneCRM – Unit: response-helper
 *
 * Tests the locked response-helper contract exactly.
 *
 * Locked success contract:
 *   { success: true, message: string, data: any, ...(meta if provided) }
 *
 * Locked error contract:
 *   { success: false, message: string, errorCode: string, errors?: any }
 *
 * These tests use a lightweight mock of the Express res object – no HTTP
 * server is started.  All assertions are deterministic and stateless.
 */

const { sendSuccess, sendError } = require('../../utils/response-helper');

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Creates a minimal mock Express response object that captures the values
 * passed to res.status().json() in a synchronous, inspectable way.
 */
function mockRes() {
  const captured = { statusCode: null, body: null };
  const res = {
    _captured: captured,
    status(code) {
      captured.statusCode = code;
      return res; // chainable
    },
    json(body) {
      captured.body = body;
      return res;
    },
  };
  return res;
}

/* ══════════════════════════════════════════════════════════════════════════
   sendSuccess
   ══════════════════════════════════════════════════════════════════════════ */

describe('sendSuccess()', () => {
  it('returns HTTP 200 by default', () => {
    const res = mockRes();
    sendSuccess(res, 'OK', { id: 1 });
    expect(res._captured.statusCode).toBe(200);
  });

  it('returns the caller-supplied HTTP status code', () => {
    const res = mockRes();
    sendSuccess(res, 'Created', { id: 42 }, 201);
    expect(res._captured.statusCode).toBe(201);
  });

  it('sets success: true in the body', () => {
    const res = mockRes();
    sendSuccess(res, 'OK', {});
    expect(res._captured.body.success).toBe(true);
  });

  it('includes the supplied message in the body', () => {
    const res = mockRes();
    sendSuccess(res, 'Patient retrieved', { name: 'Jane' });
    expect(res._captured.body.message).toBe('Patient retrieved');
  });

  it('includes the supplied data payload verbatim', () => {
    const res = mockRes();
    const payload = { patientId: 'abc-123', dob: '1990-01-01' };
    sendSuccess(res, 'OK', payload);
    expect(res._captured.body.data).toEqual(payload);
  });

  it('sets data to null when data argument is null', () => {
    const res = mockRes();
    sendSuccess(res, 'Logged out', null);
    expect(res._captured.body.data).toBeNull();
  });

  it('sets data to an empty array when an empty array is supplied', () => {
    const res = mockRes();
    sendSuccess(res, 'Empty list', []);
    expect(res._captured.body.data).toEqual([]);
  });

  it('does NOT include a meta key when meta is not supplied', () => {
    const res = mockRes();
    sendSuccess(res, 'OK', { id: 1 });
    expect(res._captured.body).not.toHaveProperty('meta');
  });

  it('includes meta in the body when meta is supplied', () => {
    const res = mockRes();
    const meta = { page: 1, total: 50, limit: 10 };
    sendSuccess(res, 'OK', [], 200, meta);
    expect(res._captured.body.meta).toEqual(meta);
  });

  it('does NOT include success: false anywhere in a success response', () => {
    const res = mockRes();
    sendSuccess(res, 'OK', {});
    expect(res._captured.body.success).not.toBe(false);
  });

  it('preserves nested data objects without mutation', () => {
    const res = mockRes();
    const nested = { user: { id: 1, roles: ['admin', 'doctor'] } };
    sendSuccess(res, 'OK', nested);
    expect(res._captured.body.data).toStrictEqual(nested);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   sendError
   ══════════════════════════════════════════════════════════════════════════ */

describe('sendError()', () => {
  it('returns the supplied HTTP status code', () => {
    const res = mockRes();
    sendError(res, 400, 'Bad input', 'VALIDATION_ERROR');
    expect(res._captured.statusCode).toBe(400);
  });

  it('sets success: false in the body', () => {
    const res = mockRes();
    sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    expect(res._captured.body.success).toBe(false);
  });

  it('includes the supplied message in the body', () => {
    const res = mockRes();
    sendError(res, 403, 'Access denied', 'FORBIDDEN');
    expect(res._captured.body.message).toBe('Access denied');
  });

  it('includes the errorCode in the body', () => {
    const res = mockRes();
    sendError(res, 404, 'Not found', 'NOT_FOUND');
    expect(res._captured.body.errorCode).toBe('NOT_FOUND');
  });

  it('does NOT include a success: true anywhere in an error response', () => {
    const res = mockRes();
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
    expect(res._captured.body.success).not.toBe(true);
  });

  it('omits the errors key when no validation errors are provided', () => {
    const res = mockRes();
    sendError(res, 400, 'Bad input', 'VALIDATION_ERROR');
    expect(res._captured.body).not.toHaveProperty('errors');
  });

  it('includes errors array when validation detail is supplied', () => {
    const res = mockRes();
    const validationErrors = [
      { field: 'email', message: 'must be a valid email' },
      { field: 'phone', message: 'must be 10 digits' },
    ];
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', validationErrors);
    expect(res._captured.body.errors).toEqual(validationErrors);
  });

  it('handles status 422 correctly', () => {
    const res = mockRes();
    sendError(res, 422, 'Unprocessable', 'UNPROCESSABLE_ENTITY');
    expect(res._captured.statusCode).toBe(422);
    expect(res._captured.body.success).toBe(false);
  });

  it('handles status 409 Conflict correctly', () => {
    const res = mockRes();
    sendError(res, 409, 'Email already in use', 'CONFLICT');
    expect(res._captured.statusCode).toBe(409);
    expect(res._captured.body.errorCode).toBe('CONFLICT');
  });

  it('handles status 500 without leaking a stack trace in the body', () => {
    const res = mockRes();
    sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    expect(res._captured.body).not.toHaveProperty('stack');
  });

  it('does NOT include a data key in error responses', () => {
    const res = mockRes();
    sendError(res, 400, 'Bad input', 'VALIDATION_ERROR');
    expect(res._captured.body).not.toHaveProperty('data');
  });
});
