// src/modules/auth/auth.routes.js
'use strict';

const { Router } = require('express');

const authController = require('./auth.controller');
const { validateLogin, validateChangePassword } = require('./auth.validator');
const { authenticate } = require('../../middleware/auth.middleware');
const { authRateLimiter } = require('../../middleware/rate-limiter.middleware');

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validateLogin,
  authController.login,
);

router.post(
  '/refresh',
  authController.refresh,
);

router.post(
  '/logout',
  authenticate,
  authController.logout,
);

router.post(
  '/change-password',
  authenticate,
  validateChangePassword,
  authController.changePassword,
);

module.exports = router;