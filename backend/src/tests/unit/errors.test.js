'use strict';

/**
 * GyneCRM – Unit: errors
 *
 * Tests every error class exported from src/utils/errors.js exactly as
 * locked in Batch 1.
 *
 * Locked error classes and their contracts:
 *
 *   AppError          – base class, isOperational = true
 *   ValidationError   – 400, errorCode = 'VALIDATION_ERROR'
 *   UnauthorizedError – 401, errorCode = 'UNAUTHORIZED'
 *   ForbiddenError    – 403, errorCode = 'FORBIDDEN'
 *   NotFoundError     – 404, errorCode = 'NOT_FOUND'
 *   ConflictError     – 409, errorCode = 'CONFLICT'
 *   InternalError     – 500, errorCode = 'INTERNAL_ERROR', isOperational = false
 *
 * All tests are stateless; no external dependencies are required.
 */

const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
} = require('../../utils/errors');

/* ══════════════════════════════════════════════════════════════════════════
   AppError – base class
   ══════════════════════════════════════════════════════════════════════════ */

describe('AppError (base)', () => {
  it('is an instance of Error', () => {
    const err = new AppError('Something went wrong', 500, 'BASE_ERROR');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of AppError', () => {
    const err = new AppError('Something went wrong', 500, 'BASE_ERROR');
    expect(err).toBeInstanceOf(AppError);
  });

  it('sets message correctly', () => {
    const err = new AppError('Custom message', 400, 'CUSTOM');
    expect(err.message).toBe('Custom message');
  });

  it('sets statusCode correctly', () => {
    const err = new AppError('msg', 418, 'TEAPOT');
    expect(err.statusCode).toBe(418);
  });

  it('sets errorCode correctly', () => {
    const err = new AppError('msg', 400, 'MY_CODE');
    expect(err.errorCode).toBe('MY_CODE');
  });

  it('sets isOperational = true by default', () => {
    const err = new AppError('msg', 400, 'CODE');
    expect(err.isOperational).toBe(true);
  });

  it('captures a stack trace', () => {
    const err = new AppError('msg', 500, 'CODE');
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe('string');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ValidationError
   ══════════════════════════════════════════════════════════════════════════ */

describe('ValidationError', () => {
  it('extends AppError', () => {
    const err = new ValidationError('Invalid input');
    expect(err).toBeInstanceOf(AppError);
  });

  it('is an instance of ValidationError', () => {
    const err = new ValidationError('Invalid input');
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('has statusCode 400', () => {
    const err = new ValidationError('Bad');
    expect(err.statusCode).toBe(400);
  });

  it('has errorCode VALIDATION_ERROR', () => {
    const err = new ValidationError('Bad');
    expect(err.errorCode).toBe('VALIDATION_ERROR');
  });

  it('sets the message supplied by caller', () => {
    const err = new ValidationError('email is required');
    expect(err.message).toBe('email is required');
  });

  it('is operational', () => {
    const err = new ValidationError('Bad');
    expect(err.isOperational).toBe(true);
  });

  it('accepts optional errors detail array', () => {
    const details = [{ field: 'email', message: 'invalid format' }];
    const err = new ValidationError('Validation failed', details);
    expect(err.errors).toEqual(details);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   UnauthorizedError
   ══════════════════════════════════════════════════════════════════════════ */

describe('UnauthorizedError', () => {
  it('extends AppError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
  });

  it('has statusCode 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it('has errorCode UNAUTHORIZED', () => {
    expect(new UnauthorizedError().errorCode).toBe('UNAUTHORIZED');
  });

  it('uses default message when none supplied', () => {
    const err = new UnauthorizedError();
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
  });

  it('uses caller-supplied message when provided', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('is operational', () => {
    expect(new UnauthorizedError().isOperational).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ForbiddenError
   ══════════════════════════════════════════════════════════════════════════ */

describe('ForbiddenError', () => {
  it('extends AppError', () => {
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
  });

  it('has statusCode 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('has errorCode FORBIDDEN', () => {
    expect(new ForbiddenError().errorCode).toBe('FORBIDDEN');
  });

  it('uses caller-supplied message', () => {
    const err = new ForbiddenError('Insufficient role');
    expect(err.message).toBe('Insufficient role');
  });

  it('is operational', () => {
    expect(new ForbiddenError().isOperational).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   NotFoundError
   ══════════════════════════════════════════════════════════════════════════ */

describe('NotFoundError', () => {
  it('extends AppError', () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
  });

  it('has statusCode 404', () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it('has errorCode NOT_FOUND', () => {
    expect(new NotFoundError().errorCode).toBe('NOT_FOUND');
  });

  it('uses default message when none supplied', () => {
    const err = new NotFoundError();
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
  });

  it('uses caller-supplied message', () => {
    const err = new NotFoundError('Patient not found');
    expect(err.message).toBe('Patient not found');
  });

  it('is operational', () => {
    expect(new NotFoundError().isOperational).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ConflictError
   ══════════════════════════════════════════════════════════════════════════ */

describe('ConflictError', () => {
  it('extends AppError', () => {
    expect(new ConflictError()).toBeInstanceOf(AppError);
  });

  it('has statusCode 409', () => {
    expect(new ConflictError().statusCode).toBe(409);
  });

  it('has errorCode CONFLICT', () => {
    expect(new ConflictError().errorCode).toBe('CONFLICT');
  });

  it('uses caller-supplied message', () => {
    const err = new ConflictError('Email already registered');
    expect(err.message).toBe('Email already registered');
  });

  it('is operational', () => {
    expect(new ConflictError().isOperational).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   InternalError
   ══════════════════════════════════════════════════════════════════════════ */

describe('InternalError', () => {
  it('extends AppError', () => {
    expect(new InternalError()).toBeInstanceOf(AppError);
  });

  it('has statusCode 500', () => {
    expect(new InternalError().statusCode).toBe(500);
  });

  it('has errorCode INTERNAL_ERROR', () => {
    expect(new InternalError().errorCode).toBe('INTERNAL_ERROR');
  });

  it('has isOperational = false', () => {
    // InternalError represents unexpected failures – not operational
    expect(new InternalError().isOperational).toBe(false);
  });

  it('uses default message when none supplied', () => {
    const err = new InternalError();
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Cross-class invariants
   ══════════════════════════════════════════════════════════════════════════ */

describe('Error class invariants', () => {
  const operationalErrors = [
    ['ValidationError', () => new ValidationError('x')],
    ['UnauthorizedError', () => new UnauthorizedError()],
    ['ForbiddenError', () => new ForbiddenError()],
    ['NotFoundError', () => new NotFoundError()],
    ['ConflictError', () => new ConflictError()],
  ];

  test.each(operationalErrors)(
    '%s is always isOperational = true',
    (_name, factory) => {
      expect(factory().isOperational).toBe(true);
    }
  );

  it('every AppError subclass carries a statusCode on the instance', () => {
    const errors = [
      new ValidationError('x'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError(),
      new InternalError(),
    ];
    errors.forEach((err) => {
      expect(typeof err.statusCode).toBe('number');
      expect(err.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  it('every AppError subclass carries a string errorCode', () => {
    const errors = [
      new ValidationError('x'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError(),
      new InternalError(),
    ];
    errors.forEach((err) => {
      expect(typeof err.errorCode).toBe('string');
      expect(err.errorCode.length).toBeGreaterThan(0);
    });
  });

  it('no two classes share the same default statusCode pairing with the wrong code', () => {
    expect(new ValidationError('x').statusCode).not.toBe(401);
    expect(new UnauthorizedError().statusCode).not.toBe(403);
    expect(new ForbiddenError().statusCode).not.toBe(404);
    expect(new NotFoundError().statusCode).not.toBe(409);
    expect(new ConflictError().statusCode).not.toBe(400);
  });
});
