'use strict';

const jwt = require('jsonwebtoken');
const config = require('./env');

// ---------------------------------------------------------
// Locked constants
// ---------------------------------------------------------
const JWT_AUDIENCE = 'gynecrm-api';
const JWT_ISSUER = config.APP_NAME || config.app?.name || 'GyneCRM';
const REFRESH_TOKEN_COOKIE_NAME = 'gynecrm_refresh';

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
/**
 * Converts a duration string like:
 *   15m, 7d, 24h, 30s
 * into milliseconds for cookie maxAge.
 *
 * If a number is passed, it is treated as seconds.
 *
 * @param {string|number} value
 * @returns {number}
 */
const durationToMs = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value * 1000;
  }

  if (!value) return 7 * 24 * 60 * 60 * 1000;

  const str = String(value).trim();

  // plain integer string = seconds
  if (/^\d+$/.test(str)) {
    return Number.parseInt(str, 10) * 1000;
  }

  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`[jwt] Invalid duration format: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`[jwt] Unsupported duration unit: ${unit}`);
  }
};

const REFRESH_COOKIE_MAX_AGE = durationToMs(
  config.JWT_REFRESH_EXPIRES_IN || config.jwt?.refreshExpiresIn || '7d',
);

/**
 * Validates the locked JWT payload shape.
 *
 * @param {object} payload
 * @param {string} fnName
 */
const assertPayload = (payload, fnName) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${fnName} requires a payload object`);
  }

  const { userId, hospitalId, role } = payload;

  if (!userId || !hospitalId || !role) {
    throw new Error(
      `${fnName} requires userId, hospitalId, and role in payload`,
    );
  }
};

// ---------------------------------------------------------
// Token sign helpers
// ---------------------------------------------------------
/**
 * Signs a JWT access token.
 * Locked payload shape:
 * { userId, hospitalId, branchId, role, iat, exp }
 *
 * @param {{ userId: string, hospitalId: string, branchId: string|null, role: string }} payload
 * @returns {string}
 */
const signAccessToken = (payload) => {
  assertPayload(payload, 'signAccessToken');

  const { userId, hospitalId, branchId = null, role } = payload;

  return jwt.sign(
    { userId, hospitalId, branchId, role },
    config.JWT_SECRET || config.jwt?.secret,
    {
      expiresIn: config.JWT_EXPIRES_IN || config.jwt?.accessExpiresIn || '15m',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
};

/**
 * Signs a JWT refresh token.
 * Locked payload shape:
 * { userId, hospitalId, branchId, role, iat, exp }
 *
 * @param {{ userId: string, hospitalId: string, branchId: string|null, role: string }} payload
 * @returns {string}
 */
const signRefreshToken = (payload) => {
  assertPayload(payload, 'signRefreshToken');

  const { userId, hospitalId, branchId = null, role } = payload;

  return jwt.sign(
    { userId, hospitalId, branchId, role },
    config.JWT_REFRESH_SECRET || config.jwt?.refreshSecret,
    {
      expiresIn:
        config.JWT_REFRESH_EXPIRES_IN || config.jwt?.refreshExpiresIn || '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
};

// ---------------------------------------------------------
// Token verify helpers
// ---------------------------------------------------------
/**
 * Verifies a JWT access token.
 *
 * @param {string} token
 * @returns {{ userId: string, hospitalId: string, branchId: string|null, role: string, iat: number, exp: number }}
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, config.JWT_SECRET || config.jwt?.secret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

/**
 * Verifies a JWT refresh token.
 *
 * @param {string} token
 * @returns {{ userId: string, hospitalId: string, branchId: string|null, role: string, iat: number, exp: number }}
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, config.JWT_REFRESH_SECRET || config.jwt?.refreshSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

// ---------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------
/**
 * httpOnly cookie options for refresh token.
 *
 * @returns {import('express').CookieOptions}
 */
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction || config.cookie?.secure || false,
  sameSite: config.isProduction ? 'strict' : 'lax',
  maxAge: REFRESH_COOKIE_MAX_AGE,
  path: '/api/v1/auth',
});

/**
 * Cookie options for clearing refresh token cookie.
 *
 * @returns {import('express').CookieOptions}
 */
const getClearRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction || config.cookie?.secure || false,
  sameSite: config.isProduction ? 'strict' : 'lax',
  expires: new Date(0),
  path: '/api/v1/auth',
});

// ---------------------------------------------------------
// Compatibility exports
// ---------------------------------------------------------
// These aliases help current code/tests if they still expect these names.
const accessSecret = config.JWT_SECRET || config.jwt?.secret;
const refreshSecret = config.JWT_REFRESH_SECRET || config.jwt?.refreshSecret;
const accessExpiresIn =
  config.JWT_EXPIRES_IN || config.jwt?.accessExpiresIn || '15m';
const refreshExpiresIn =
  config.JWT_REFRESH_EXPIRES_IN || config.jwt?.refreshExpiresIn || '7d';
const refreshCookieName = REFRESH_TOKEN_COOKIE_NAME;
const refreshCookieMaxAge = REFRESH_COOKIE_MAX_AGE;

// ---------------------------------------------------------
// Exports
// ---------------------------------------------------------
module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
  getClearRefreshCookieOptions,

  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE,

  // compatibility aliases
  accessSecret,
  refreshSecret,
  accessExpiresIn,
  refreshExpiresIn,
  refreshCookieName,
  refreshCookieMaxAge,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};