const HTTP_STATUS = require('../constants/http-status');

function buildErrorResponse(error, options = {}) {
  const {
    isProduction = false,
    requestId,
  } = options;

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isOperational = Boolean(error.isOperational);
  const shouldExposeMessage = statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR || !isProduction || isOperational;

  const response = {
    success: false,
    message: shouldExposeMessage
      ? error.message || 'Internal server error.'
      : 'Internal server error.',
  };

  if (requestId) {
    response.request_id = requestId;
  }

  if (error.details !== undefined && statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    response.details = error.details;
  } else if (error.details !== undefined && !isProduction) {
    response.details = error.details;
  }

  if (error.stack && !isProduction) {
    response.stack = error.stack;
  }

  return response;
}

module.exports = {
  buildErrorResponse,
};
