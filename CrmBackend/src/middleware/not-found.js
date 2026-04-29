const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');

function notFound(req, res, next) {
  return next(
    new AppError(`Route not found: ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND),
  );
}

module.exports = notFound;
