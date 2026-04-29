const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DevAuthUser = require('../models/DevAuthUser.model');

const ACCESS_TOKEN_TTL = process.env.DEV_AUTH_ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.DEV_AUTH_REFRESH_TOKEN_TTL || '7d';
const REFRESH_COOKIE_NAME = 'refreshToken';
const JWT_SECRET = process.env.SECRET_KEY;

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    const error = new Error('SECRET_KEY is not configured.');
    error.statusCode = 500;
    throw error;
  }
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signAccessToken(user) {
  ensureJwtSecret();

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user) {
  ensureJwtSecret();

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

async function hashValue(value) {
  return bcrypt.hash(value, 10);
}

async function matchesHash(value, hash) {
  if (!hash) {
    return false;
  }

  return bcrypt.compare(value, hash);
}

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function buildUserPayload(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required.');
    }

    const user = await DevAuthUser.findOne({ email }).select('+passwordHash +refreshTokenHash');

    if (!user || !user.isActive) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshTokenHash = await hashValue(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Login failed.');
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return sendError(res, 401, 'Refresh token is required.');
    }

    ensureJwtSecret();
    const payload = jwt.verify(refreshToken, JWT_SECRET);

    if (payload.type !== 'refresh') {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    const user = await DevAuthUser.findById(payload.id).select('+refreshTokenHash');
    if (!user || !user.isActive) {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    const isRefreshTokenValid = await matchesHash(refreshToken, user.refreshTokenHash);
    if (!isRefreshTokenValid) {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    const accessToken = signAccessToken(user);

    return res.status(200).json({
      success: true,
      message: 'Refresh successful.',
      data: {
        accessToken,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    return sendError(res, 401, 'Invalid or expired refresh token.');
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      try {
        ensureJwtSecret();
        const payload = jwt.verify(refreshToken, JWT_SECRET);
        if (payload?.id) {
          await DevAuthUser.findByIdAndUpdate(payload.id, { refreshTokenHash: null });
        }
      } catch (error) {
        // Clear cookie and return success even if the refresh token is already invalid.
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    return sendError(res, 500, 'Logout failed.');
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const oldPassword = String(req.body?.oldPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!userId) {
      return sendError(res, 401, 'Authentication is required.');
    }

    if (!oldPassword || !newPassword) {
      return sendError(res, 400, 'Old password and new password are required.');
    }

    if (oldPassword === newPassword) {
      return sendError(res, 400, 'New password must be different from the old password.');
    }

    const user = await DevAuthUser.findById(userId).select('+passwordHash +refreshTokenHash');
    if (!user || !user.isActive) {
      return sendError(res, 404, 'User not found.');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Old password is incorrect.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.refreshTokenHash = null;
    await user.save();

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    return sendError(res, 500, 'Change password failed.');
  }
};
