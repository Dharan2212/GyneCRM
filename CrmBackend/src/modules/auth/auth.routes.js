const express = require('express');
const validateRequest = require('../../middleware/validate-request');
const auth = require('../../middleware/auth');
const controller = require('./auth.controller');
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
} = require('./auth.validator');

const router = express.Router();

router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', validateRequest(refreshSchema), controller.refresh);
router.post('/logout', auth, validateRequest(logoutSchema), controller.logout);
router.post('/change-password', auth, validateRequest(changePasswordSchema), controller.changePassword);

module.exports = router;
