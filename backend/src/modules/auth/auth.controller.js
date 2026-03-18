// src/modules/auth/auth.controller.js
'use strict';

const authService     = require('./auth.service');
const { sendSuccess } = require('../../utils/response-helper');
const jwtConfig       = require('../../config/jwt');

// ---------------------------------------------------------------------------
// Cookie helpers — derived entirely from locked jwtConfig
// ---------------------------------------------------------------------------

/**
 * Build the Set-Cookie options for the refresh token.
 * maxAge is derived from jwtConfig.refreshCookieMaxAge (milliseconds).
 *
 * @returns {import('express').CookieOptions}
 */
function _refreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge:   jwtConfig.refreshCookieMaxAge,
    path:     '/api/v1/auth',
  };
}

/**
 * Build the clearCookie options. Path must match Set-Cookie path exactly.
 *
 * @returns {import('express').CookieOptions}
 */
function _clearCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path:     '/api/v1/auth',
  };
}

// ---------------------------------------------------------------------------
// Request context helpers
// ---------------------------------------------------------------------------

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function _getIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function _getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

// ---------------------------------------------------------------------------
// Controller handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/login
 *
 * @type {import('express').RequestHandler}
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { accessToken, refreshToken, user } = await authService.login({
      email,
      password,
      ip:        _getIp(req),
      userAgent: _getUserAgent(req),
    });

    res.cookie(jwtConfig.refreshCookieName, refreshToken, _refreshCookieOptions());

    return sendSuccess(res, 200, 'Login successful.', {
      access_token: accessToken,
      token_type:   'Bearer',
      user,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Refresh token is read from httpOnly cookie — no Authorization header required.
 *
 * @type {import('express').RequestHandler}
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[jwtConfig.refreshCookieName];

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(
      refreshToken,
      _getIp(req),
      _getUserAgent(req),
    );

    res.cookie(jwtConfig.refreshCookieName, newRefreshToken, _refreshCookieOptions());

    return sendSuccess(res, 200, 'Token refreshed.', {
      access_token: accessToken,
      token_type:   'Bearer',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Requires: authMiddleware (all authenticated roles).
 *
 * @type {import('express').RequestHandler}
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user, _getIp(req), _getUserAgent(req));

    res.clearCookie(jwtConfig.refreshCookieName, _clearCookieOptions());

    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/change-password
 * Requires: authMiddleware (all authenticated roles).
 * Forces re-login after success (refresh cookie cleared server-side).
 *
 * @type {import('express').RequestHandler}
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    await authService.changePassword(
      req.user,
      current_password,
      new_password,
      _getIp(req),
      _getUserAgent(req),
    );

    // Invalidate the active session by clearing the refresh cookie.
    res.clearCookie(jwtConfig.refreshCookieName, _clearCookieOptions());

    return sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
};
