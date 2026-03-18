'use strict';

const express = require('express');
const router = express.Router();

const controller = require('./users.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { globalRateLimiter } = require('../../middleware/rate-limiter.middleware');

router.use(authenticate);
router.use(enforceHospitalScope);
router.use(roleCheck(['admin']));
router.use(globalRateLimiter);

router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.get('/:id', controller.getUserById);
router.put('/:id', controller.updateUser);
router.patch('/:id/activate', controller.activateUser);
router.patch('/:id/deactivate', controller.deactivateUser);

module.exports = router;
