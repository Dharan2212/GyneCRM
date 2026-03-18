// src/modules/auth/auth.service.js
'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../../db/connection');
const logger = require('../../utils/logger');
const { createError } = require('../../utils/errors');
const jwtConfig = require('../../config/jwt');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a user record with role name joined, by email.
 * Returns undefined if not found or soft-deleted.
 *
 * @param {string} email
 * @returns {Promise<object|undefined>}
 */
async function _getUserByEmail(email) {
  return db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('users.email', email.toLowerCase().trim())
    .where('users.is_deleted', false)
    .select(
      'users.id',
      'users.hospital_id',
      'users.branch_id',
      'users.role_id',
      'users.name',
      'users.email',
      'users.password_hash',
      'users.is_active',
      'users.failed_login_attempts',
      'users.locked_until',
      'users.last_login_at',
      'roles.name as role_name',
    )
    .first();
}

/**
 * Fetches a user record with role name joined, by UUID.
 * Returns undefined if not found or soft-deleted.
 *
 * @param {string} userId
 * @returns {Promise<object|undefined>}
 */
async function _getUserById(userId) {
  return db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('users.id', userId)
    .where('users.is_deleted', false)
    .select(
      'users.id',
      'users.hospital_id',
      'users.branch_id',
      'users.role_id',
      'users.name',
      'users.email',
      'users.password_hash',
      'users.is_active',
      'users.failed_login_attempts',
      'users.locked_until',
      'roles.name as role_name',
    )
    .first();
}

/**
 * Signs a JWT access token using locked jwtConfig values.
 *
 * @param {{ userId: string, hospitalId: string, branchId: string|null, role: string }} payload
 * @returns {string}
 */
function _signAccessToken({ userId, hospitalId, branchId, role }) {
  return jwt.sign(
    { userId, hospitalId, branchId, role },
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpiresIn || '15m',
      issuer:    jwtConfig.issuer,
      audience:  jwtConfig.audience,
    },
  );
}

/**
 * Signs a JWT refresh token using locked jwtConfig values.
 *
 * @param {{ userId: string, hospitalId: string, branchId: string|null, role: string }} payload
 * @returns {string}
 */
function _signRefreshToken({ userId, hospitalId, branchId, role }) {
  return jwt.sign(
    { userId, hospitalId, branchId, role },
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn || '7d',
      issuer:    jwtConfig.issuer,
      audience:  jwtConfig.audience,
    },
  );
}

/**
 * Appends one row to activity_logs. Fire-and-forget: errors are logged only,
 * never rethrown — a failed audit log must never block the primary operation.
 *
 * @param {{ hospital_id: string, user_id: string|null, action: string,
 *           entity_id: string|null, meta: object,
 *           ip_address: string|null, user_agent: string|null }} entry
 */
async function _appendActivityLog(entry) {
  try {
    await db('activity_logs').insert({
      hospital_id: entry.hospital_id,
      user_id:     entry.user_id    ?? null,
      action:      entry.action,
      module:      'auth',
      entity_type: 'User',
      entity_id:   entry.entity_id  ?? null,
      meta:        JSON.stringify(entry.meta ?? {}),
      ip_address:  entry.ip_address ?? null,
    });
  } catch (err) {
    logger.error('activity_logs insert failed', { action: entry.action, err: err.message });
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Validates credentials, enforces lockout policy, resets failure counter on
 * success, and returns a signed token pair plus safe user data.
 *
 * @param {{ email: string, password: string, ip: string, userAgent: string }} params
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
async function login({ email, password, ip, userAgent }) {
  const user = await _getUserByEmail(email);

  // Generic 401 for missing user — prevents email enumeration.
  if (!user) {
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (!user.is_active) {
    throw createError(401, 'ACCOUNT_DEACTIVATED', 'Account is deactivated. Contact your administrator.');
  }

  // Lockout check — compare against current wall-clock time.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const unlockAt = new Date(user.locked_until).toISOString();

    await _appendActivityLog({
      hospital_id: user.hospital_id,
      user_id:     user.id,
      action:      'login_failed',
      entity_id:   user.id,
      meta:        { reason: 'account_locked', unlock_at: unlockAt },
      ip_address:  ip,
      user_agent:  userAgent,
    });

    throw createError(
      401,
      'ACCOUNT_LOCKED',
      `Account is temporarily locked. Try again after ${unlockAt}.`,
      [{ unlock_at: unlockAt }],
    );
  }

  // Password comparison (constant-time via bcrypt.compare).
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    const newAttempts = (user.failed_login_attempts || 0) + 1;
    const shouldLock   = newAttempts >= MAX_FAILED_ATTEMPTS;

    const updatePayload = {
      failed_login_attempts: newAttempts,
      updated_at:            db.fn.now(),
    };

    if (shouldLock) {
      updatePayload.locked_until = db.raw(`NOW() + INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'`);
    }

    await db('users').where('id', user.id).update(updatePayload);

    await _appendActivityLog({
      hospital_id: user.hospital_id,
      user_id:     user.id,
      action:      'login_failed',
      entity_id:   user.id,
      meta:        { reason: 'invalid_password', failed_attempts: newAttempts, locked: shouldLock },
      ip_address:  ip,
      user_agent:  userAgent,
    });

    if (shouldLock) {
      throw createError(
        401,
        'ACCOUNT_LOCKED',
        `Invalid credentials. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts.`,
      );
    }

    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  // Success: reset failure state and update last_login_at.
  await db('users').where('id', user.id).update({
    failed_login_attempts: 0,
    locked_until:          null,
    last_login_at:         db.fn.now(),
    updated_at:            db.fn.now(),
  });

  const tokenPayload = {
    userId:     user.id,
    hospitalId: user.hospital_id,
    branchId:   user.branch_id ?? null,
    role:       user.role_name,
  };

  const accessToken  = _signAccessToken(tokenPayload);
  const refreshToken = _signRefreshToken(tokenPayload);

  await _appendActivityLog({
    hospital_id: user.hospital_id,
    user_id:     user.id,
    action:      'login_success',
    entity_id:   user.id,
    meta:        { role: user.role_name },
    ip_address:  ip,
    user_agent:  userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role_name,
      hospital_id: user.hospital_id,
      branch_id:   user.branch_id ?? null,
    },
  };
}

/**
 * Verifies the refresh JWT, validates that the user is still active and
 * hospital-scoped, then rotates the token pair.
 *
 * @param {string}  refreshToken  Raw JWT string from httpOnly cookie.
 * @param {string}  ip
 * @param {string}  userAgent
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function refreshTokens(refreshToken, ip, userAgent) {
  if (!refreshToken) {
    throw createError(401, 'MISSING_REFRESH_TOKEN', 'Refresh token is missing.');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret, {
      issuer:   jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (_err) {
    throw createError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or has expired.');
  }

  const user = await _getUserById(decoded.userId);

  if (!user || !user.is_active) {
    throw createError(401, 'USER_UNAVAILABLE', 'User account not found or has been deactivated.');
  }

  // Hard hospital-scope guard: token's hospitalId must match the live DB value.
  if (user.hospital_id !== decoded.hospitalId) {
    throw createError(401, 'HOSPITAL_SCOPE_MISMATCH', 'Token hospital scope mismatch.');
  }

  const tokenPayload = {
    userId:     user.id,
    hospitalId: user.hospital_id,
    branchId:   user.branch_id ?? null,
    role:       user.role_name,
  };

  const newAccessToken  = _signAccessToken(tokenPayload);
  const newRefreshToken = _signRefreshToken(tokenPayload);

  await _appendActivityLog({
    hospital_id: user.hospital_id,
    user_id:     user.id,
    action:      'token_refreshed',
    entity_id:   user.id,
    meta:        {},
    ip_address:  ip,
    user_agent:  userAgent,
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Stateless logout — no server-side token store to modify.
 * The controller clears the httpOnly cookie. This method only writes the audit log.
 *
 * @param {object} reqUser  Decoded JWT payload attached by authMiddleware (req.user).
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<void>}
 */
async function logout(reqUser, ip, userAgent) {
  await _appendActivityLog({
    hospital_id: reqUser.hospitalId,
    user_id:     reqUser.userId,
    action:      'logout',
    entity_id:   reqUser.userId,
    meta:        {},
    ip_address:  ip,
    user_agent:  userAgent,
  });
}

/**
 * Validates the current password, hashes the new one, persists it, and
 * forces re-login by signalling the controller to clear the refresh cookie.
 *
 * @param {object} reqUser        Decoded JWT payload from authMiddleware.
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<void>}
 */
async function changePassword(reqUser, currentPassword, newPassword, ip, userAgent) {
  const user = await _getUserById(reqUser.userId);

  if (!user) {
    throw createError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  // Re-enforce hospital scope at the service layer.
  if (user.hospital_id !== reqUser.hospitalId) {
    throw createError(403, 'HOSPITAL_SCOPE_MISMATCH', 'Hospital scope mismatch.');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatch) {
    throw createError(400, 'INCORRECT_CURRENT_PASSWORD', 'Current password is incorrect.');
  }

  // Prevent silent no-op when the new password equals the old one.
  const samePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (samePassword) {
    throw createError(400, 'PASSWORD_REUSE', 'New password must be different from the current password.');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db('users').where('id', user.id).update({
    password_hash:         newHash,
    failed_login_attempts: 0,
    locked_until:          null,
    updated_at:            db.fn.now(),
  });

  await _appendActivityLog({
    hospital_id: user.hospital_id,
    user_id:     user.id,
    action:      'password_changed',
    entity_id:   user.id,
    meta:        {},
    ip_address:  ip,
    user_agent:  userAgent,
  });
}

module.exports = {
  login,
  refreshTokens,
  logout,
  changePassword,
};
