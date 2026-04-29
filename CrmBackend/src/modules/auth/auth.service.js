const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const config = require('../../config/env');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const logger = require('../../utils/logger');

const SALT_ROUNDS = 10;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function sanitizeUser(user) {
  return {
    id: String(user._id),
    hospital_id: user.hospital_id ? String(user.hospital_id) : null,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    phone: user.phone || null,
    is_active: user.is_active,
    is_locked: user.is_locked,
    last_login_at: user.last_login_at,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      role: user.role,
      hospital_id: user.hospital_id ? String(user.hospital_id) : null,
    },
    config.auth.accessTokenSecret,
    { expiresIn: config.auth.accessTokenExpiresIn },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      role: user.role,
    },
    config.auth.refreshTokenSecret,
    { expiresIn: config.auth.refreshTokenExpiresIn },
  );
}

async function hashValue(value) {
  return bcrypt.hash(value, SALT_ROUNDS);
}

async function compareValue(plainValue, hashedValue) {
  if (!plainValue || !hashedValue) {
    return false;
  }

  return bcrypt.compare(plainValue, hashedValue);
}

async function ensureUserIsLoginReady(user) {
  if (!user) {
    throw new AppError('Invalid email or password.', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!user.is_active) {
    throw new AppError('Your account is inactive.', HTTP_STATUS.FORBIDDEN);
  }

  const now = Date.now();
  if (user.is_locked && user.lockout_until && new Date(user.lockout_until).getTime() > now) {
    throw new AppError('Your account is temporarily locked. Please try again later.', HTTP_STATUS.FORBIDDEN);
  }

  if (user.is_locked || user.lockout_until) {
    user.is_locked = false;
    user.lockout_until = null;
    user.failed_login_attempts = 0;
    await user.save({ validateBeforeSave: false });
  }
}

async function handleFailedLogin(user) {
  if (!user) {
    throw new AppError('Invalid email or password.', HTTP_STATUS.UNAUTHORIZED);
  }

  user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;

  if (user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.is_locked = true;
    user.lockout_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  await user.save({ validateBeforeSave: false });

  if (user.is_locked) {
    throw new AppError('Your account is temporarily locked due to repeated failed login attempts.', HTTP_STATUS.FORBIDDEN);
  }

  throw new AppError('Invalid email or password.', HTTP_STATUS.UNAUTHORIZED);
}

async function persistSuccessfulLogin(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refresh_token_hash = await hashValue(refreshToken);
  user.last_login_at = new Date();
  user.failed_login_attempts = 0;
  user.is_locked = false;
  user.lockout_until = null;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function login(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  const user = await User.findOne({ email }).select('+password_hash +refresh_token_hash');
  await ensureUserIsLoginReady(user);

  const isPasswordValid = await compareValue(password, user.password_hash);
  if (!isPasswordValid) {
    await handleFailedLogin(user);
  }

  logger.info('User logged in successfully.', { email, role: user.role });
  return persistSuccessfulLogin(user);
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.auth.refreshTokenSecret);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token.', HTTP_STATUS.UNAUTHORIZED);
  }

  const userId = decoded.id || decoded.userId || decoded._id;
  const user = await User.findById(userId).select('+refresh_token_hash');

  if (!user || !user.is_active || !user.refresh_token_hash) {
    throw new AppError('Refresh session is no longer valid.', HTTP_STATUS.UNAUTHORIZED);
  }

  const tokenMatches = await compareValue(refreshToken, user.refresh_token_hash);
  if (!tokenMatches) {
    throw new AppError('Refresh session is no longer valid.', HTTP_STATUS.UNAUTHORIZED);
  }

  const accessToken = signAccessToken(user);
  const rotatedRefreshToken = signRefreshToken(user);
  user.refresh_token_hash = await hashValue(rotatedRefreshToken);
  await user.save({ validateBeforeSave: false });

  logger.info('Session refreshed successfully.', { userId: String(user._id) });
  return {
    accessToken,
    refreshToken: rotatedRefreshToken,
    user: sanitizeUser(user),
  };
}

async function logout(userId) {
  if (!userId) {
    throw new AppError('Authenticated user is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      refresh_token_hash: null,
      failed_login_attempts: 0,
      is_locked: false,
      lockout_until: null,
    },
  });

  logger.info('User logged out successfully.', { userId: String(userId) });
  return { success: true };
}

async function changePassword(userId, payload) {
  if (!userId) {
    throw new AppError('Authenticated user is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  const user = await User.findById(userId).select('+password_hash +refresh_token_hash');
  if (!user) {
    throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND);
  }

  const isCurrentPasswordValid = await compareValue(payload.current_password, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect.', HTTP_STATUS.UNAUTHORIZED);
  }

  user.password_hash = await hashValue(payload.new_password);
  user.refresh_token_hash = null;
  user.failed_login_attempts = 0;
  user.is_locked = false;
  user.lockout_until = null;
  await user.save({ validateBeforeSave: false });

  logger.info('Password changed successfully.', { userId: String(user._id) });
  return { user: sanitizeUser(user) };
}

module.exports = {
  login,
  refreshSession,
  logout,
  changePassword,
};
