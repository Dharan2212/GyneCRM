const config = require('../config/env');
const HTTP_STATUS = require('../constants/http-status');
const logger = require('../utils/logger');
const { buildErrorResponse } = require('./error-response');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isOperational = Boolean(error.isOperational);
  const requestId = req.id || null;

  const logContext = {
    request_id: requestId,
    method: req.method,
    path: req.originalUrl,
    status_code: statusCode,
    message: error.message,
    details: error.details,
  };

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error('Unhandled src runtime error.', {
      ...logContext,
      stack: config.isProduction ? undefined : error.stack,
    });
  } else {
    logger.warn('Handled src runtime error.', logContext);
  }

  const response = buildErrorResponse(error, {
    isProduction: config.isProduction && !isOperational,
    requestId,
  });

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
