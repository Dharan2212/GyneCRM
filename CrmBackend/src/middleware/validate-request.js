const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');

function normalizeValidationError(error) {
  if (!error) {
    return null;
  }

  if (error.isJoi && Array.isArray(error.details)) {
    return {
      details: error.details.map((item) => ({
        message: item.message,
        path: item.path,
        type: item.type,
      })),
    };
  }

  if (Array.isArray(error.issues)) {
    return {
      details: error.issues.map((item) => ({
        message: item.message,
        path: item.path,
        code: item.code,
      })),
    };
  }

  return {
    details: error.details || error.message,
  };
}

function validateRequest(schema, options = {}) {
  const source = options.source || 'body';

  return async function validationMiddleware(req, res, next) {
    try {
      const payload = req[source];

      if (!schema) {
        return next();
      }

      if (typeof schema.parseAsync === 'function') {
        req[source] = await schema.parseAsync(payload);
        return next();
      }

      if (typeof schema.parse === 'function') {
        req[source] = schema.parse(payload);
        return next();
      }

      if (typeof schema.validateAsync === 'function') {
        req[source] = await schema.validateAsync(payload, { abortEarly: false, stripUnknown: true });
        return next();
      }

      if (typeof schema.validate === 'function') {
        const result = schema.validate(payload, { abortEarly: false, stripUnknown: true });

        if (result.error) {
          throw result.error;
        }

        req[source] = result.value;
        return next();
      }

      return next(new AppError('Unsupported validation schema provided.', HTTP_STATUS.INTERNAL_SERVER_ERROR));
    } catch (error) {
      const normalized = normalizeValidationError(error);
      return next(
        new AppError('Validation failed.', HTTP_STATUS.BAD_REQUEST, {
          details: normalized?.details,
        }),
      );
    }
  };
}

module.exports = validateRequest;
