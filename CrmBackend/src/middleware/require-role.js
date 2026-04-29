const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');

function requireRole(...roles) {
  const allowedRoles = roles.flat().filter(Boolean);

  return function roleGuard(req, res, next) {
    if (!req.user || !req.user.role) {
      return next(new AppError('Authenticated user role is required.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource.', HTTP_STATUS.FORBIDDEN));
    }

    return next();
  };
}

module.exports = requireRole;
