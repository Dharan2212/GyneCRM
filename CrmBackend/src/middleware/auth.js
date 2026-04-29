const jwt = require('jsonwebtoken');
const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');
const config = require('../config/env');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function auth(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next(new AppError('Authorization token is required.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (!config.auth.accessTokenSecret) {
      return next(new AppError('Authentication secret is not configured.', HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }

    const decoded = jwt.verify(token, config.auth.accessTokenSecret);

    req.user = {
      id: decoded.id || decoded.userId || decoded._id || null,
      role: decoded.role || null,
      email: decoded.email || null,
      hospital_id: decoded.hospital_id || null,
      raw: decoded,
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired authorization token.', HTTP_STATUS.UNAUTHORIZED));
    }

    return next(error);
  }
}

module.exports = auth;
module.exports.extractBearerToken = extractBearerToken;
