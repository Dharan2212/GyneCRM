'use strict';

/**
 * Locked Phase 3 response/error contract
 * ─────────────────────────────────────────
 * SUCCESS:
 *   {
 *     "success": true,
 *     "message": "<optional string>",
 *     "data":    <payload | null>,
 *     "meta":    <optional pagination/count object>
 *   }
 *
 * ERROR:
 *   {
 *     "success": false,
 *     "message": "<human-readable summary>",
 *     "errors":  [{ "code": "<string>", "field": "<string|null>", "detail": "<string>" }]
 *   }
 *
 * The `errors` array always contains at least one entry.
 * `field` is null for non-field-level errors (auth, not-found, etc.).
 */

/**
 * Standard success response.
 *
 * Supports TWO call signatures to be compatible with all existing controllers:
 *
 * A) Object-style (new, appointments module):
 *    sendSuccess(res, { data, message, meta, statusCode })
 *
 * B) Positional-style (auth, users, patients, doctors, hospital modules):
 *    sendSuccess(res, statusCode, message, data)
 *    sendSuccess(res, statusCode, message)
 *
 * @param {import('express').Response} res
 * @param {object|number} optsOrStatusCode
 * @param {string}  [message]
 * @param {*}       [data]
 */
const sendSuccess = (res, optsOrStatusCode = {}, message = null, data = null) => {
  let statusCode, finalMessage, finalData, meta;

  if (typeof optsOrStatusCode === 'object' && optsOrStatusCode !== null) {
    // Object-style call
    statusCode   = optsOrStatusCode.statusCode || 200;
    finalMessage = optsOrStatusCode.message    || null;
    finalData    = optsOrStatusCode.data !== undefined ? optsOrStatusCode.data : null;
    meta         = optsOrStatusCode.meta        || null;
  } else {
    // Positional-style call: sendSuccess(res, 200, 'msg', data)
    statusCode   = typeof optsOrStatusCode === 'number' ? optsOrStatusCode : 200;
    finalMessage = message;
    finalData    = data;
    meta         = null;
  }

  const body = { success: true };
  if (finalMessage !== null) body.message = finalMessage;
  body.data = finalData;
  if (meta !== null) body.meta = meta;

  return res.status(statusCode).json(body);
};

/**
 * Convenience wrapper for 201 Created.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {*}        options.data
 * @param {string}  [options.message]
 */
const sendCreated = (res, { data = null, message = null } = {}) => {
  return sendSuccess(res, { data, message, statusCode: 201 });
};

/**
 * Standard error response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}   options.statusCode   - HTTP status code
 * @param {string}   options.message      - Human-readable summary message
 * @param {Array<{ code: string, field: string|null, detail: string }>} [options.errors]
 *        At least one entry required. Defaults to a single entry built from errorCode + message.
 * @param {string}  [options.errorCode]   - Used when errors array is not provided directly
 */
const sendError = (
  res,
  { statusCode = 500, message, errorCode = 'INTERNAL_SERVER_ERROR', errors = null } = {},
) => {
  const resolvedErrors =
    errors && errors.length > 0
      ? errors
      : [{ code: errorCode, field: null, detail: message }];

  return res.status(statusCode).json({
    success: false,
    message,
    errors: resolvedErrors,
  });
};

/**
 * Paginated success response.
 * Attaches standard pagination meta and delegates to sendSuccess.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {Array}   options.data    - Page of records
 * @param {number}  options.total   - Total matching records (pre-pagination)
 * @param {number}  options.page    - Current page (1-indexed)
 * @param {number}  options.limit   - Page size
 * @param {string} [options.message]
 */
const sendPaginated = (res, { data, total, page, limit, message = null } = {}) => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, {
    data,
    message,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Normalises a Joi ValidationError detail array into the locked errors[] shape.
 *
 * @param {import('joi').ValidationErrorItem[]} joiDetails
 * @returns {Array<{ code: string, field: string|null, detail: string }>}
 */
const normaliseJoiErrors = (joiDetails) => {
  return joiDetails.map((d) => ({
    code: 'VALIDATION_ERROR',
    field: d.context && d.context.key ? String(d.context.key) : null,
    detail: d.message.replace(/['"]/g, ''),
  }));
};

/**
 * successResponse — compatibility shim for Phase 5 controller modules.
 *
 * Phase 5 controllers call:
 *   res.status(201).json(successResponse('message', data))
 *   res.status(200).json(successResponse('message', data, meta))
 *
 * This shim returns a plain response body object (does not call res itself).
 *
 * @param {string}  message
 * @param {*}       [data]
 * @param {object}  [meta]
 * @returns {{ success: boolean, message: string, data: *, meta?: object }}
 */
const successResponse = (message, data = null, meta = null) => {
  const body = { success: true, message, data };
  if (meta !== null) body.meta = meta;
  return body;
};

/**
 * errorResponse — compatibility shim for Phase 5 controller modules.
 *
 * Phase 5 controllers call:
 *   res.status(400).json(errorResponse('Validation failed.', errorsArray))
 *
 * @param {string} message
 * @param {Array}  [errors]
 * @returns {{ success: boolean, message: string, errors: Array }}
 */
const errorResponse = (message, errors = []) => ({
  success: false,
  message,
  errors: Array.isArray(errors) ? errors : [errors],
});

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendPaginated,
  normaliseJoiErrors,
  // Phase 5 compatibility shims
  successResponse,
  errorResponse,
};
