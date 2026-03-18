'use strict';

const express = require('express');
const router = express.Router();
const testOrderController = require('./testOrder.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

// /overdue MUST be registered before /:id to avoid Express matching 'overdue' as UUID
router.get('/overdue', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), testOrderController.listOverdue);
router.post('/', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), testOrderController.createTestOrder);
router.get('/', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), testOrderController.listTestOrders);
router.patch('/:id/skip', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), testOrderController.skipTestOrder);
router.patch('/:id/link-result', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist', 'staff']), testOrderController.linkResult);

module.exports = router;
