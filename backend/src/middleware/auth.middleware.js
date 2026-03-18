'use strict';

const jwt = require('jsonwebtoken');
const { db } = require('../db/connection');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

/**
 * JWT Access Token Payload Shape (locked):
 * {
 *   userId     : UUID
 *   hospitalId : UUID
 *   branchId   : UUID | null
 *   role       : 'admin' | 'doctor' | 'receptionist' | 'staff'
 *   iat        : number
 *   exp        : number
 * }
 *
 * Token location: Authorization: Bearer <token>
 * Refresh token: httpOnly cookie (handled in auth module, NOT here)
 */
const authenticate = async (req, res, next) => {
  try {
    // ─── 1. Extract bearer token ───────────────────────────────────────────
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
        errors: [],
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Token is empty.',
        errors: [],
      });
    }

    // ─── 2. Verify and decode JWT ──────────────────────────────────────────
    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.accessSecret, {
        algorithms: ['HS256'],
        issuer:     jwtConfig.issuer,
        audience:   jwtConfig.audience,
      });
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          errors: [],
        });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
          errors: [],
        });
      }
      throw jwtErr;
    }

    // ─── 3. Validate payload shape ─────────────────────────────────────────
    const { userId, hospitalId, branchId, role } = payload;

    if (!userId || !hospitalId || !role) {
      return res.status(401).json({
        success: false,
        message: 'Malformed token payload.',
        errors: [],
      });
    }

    // ─── 4. Verify user still exists and is active ─────────────────────────
    // Uses is_deleted boolean column (architecture-locked soft-delete pattern)
    const { rows } = await db.query(
      `SELECT id, is_active, hospital_id
       FROM users
       WHERE id = $1
         AND hospital_id = $2
         AND is_deleted = false
       LIMIT 1`,
      [userId, hospitalId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
        errors: [],
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated. Contact your administrator.',
        errors: [],
      });
    }

    // ─── 5. Attach identity to request ────────────────────────────────────
    req.user = {
      userId,
      hospitalId,
      branchId: branchId || null,
      role,
    };

    return next();
  } catch (err) {
    logger.error(`auth.middleware error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      success: false,
      message: 'Authentication service error.',
      errors: [],
    });
  }
};

module.exports = { authenticate };
