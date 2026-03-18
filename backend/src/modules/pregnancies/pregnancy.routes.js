'use strict';

const express = require('express');
const router = express.Router();
const pregnancyController = require('./pregnancy.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

router.post('/', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), pregnancyController.createPregnancy);
router.get('/:id', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), pregnancyController.getPregnancy);
router.put('/:id', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), pregnancyController.updatePregnancy);
router.patch('/:id/high-risk', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), pregnancyController.toggleHighRisk);
router.post('/:id/close', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), pregnancyController.closePregnancy);
router.get('/:id/milestones', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), pregnancyController.getMilestones);

module.exports = router;
