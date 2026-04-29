const config = require('../../config/env');
const HTTP_STATUS = require('../../constants/http-status');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/api-response');
const AppError = require('../../utils/app-error');
const authService = require('./auth.service');

function parseDurationToMs(value, fallbackMs) {
  if (!value) {
    return fallbackMs;
  }

  if (typeof value === 'number') {
    return value;
  }

  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  const match = text.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    domain: config.auth.cookieDomain || undefined,
    path: '/api/v1/auth',
    maxAge: parseDurationToMs(config.auth.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000),
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(config.auth.cookieName, refreshToken, getRefreshTokenCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    domain: config.auth.cookieDomain || undefined,
    path: '/api/v1/auth',
  });
}

function getRefreshTokenFromRequest(req) {
  return req.cookies?.[config.auth.cookieName] || req.body?.refresh_token || null;
}

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setRefreshTokenCookie(res, result.refreshToken);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Login successful.',
    data: {
      access_token: result.accessToken,
      token_type: 'Bearer',
      user: result.user,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    throw new AppError('Refresh token is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  const result = await authService.refreshSession(refreshToken);
  setRefreshTokenCookie(res, result.refreshToken);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Session refreshed successfully.',
    data: {
      access_token: result.accessToken,
      token_type: 'Bearer',
      user: result.user,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user?.id);
  clearRefreshTokenCookie(res);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logout successful.',
  });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user?.id, req.body);
  clearRefreshTokenCookie(res);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Password changed successfully. Please log in again.',
  });
});

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
};
