'use strict';

const express = require('express');
const router = express.Router();
const prescriptionController = require('./prescription.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

router.post('/', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.createPrescription);
router.get('/:id', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), prescriptionController.getPrescription);
router.put('/:id', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.updatePrescription);
router.post('/:id/items', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.addItem);
router.put('/:id/items/:itemId', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.updateItem);
router.delete('/:id/items/:itemId', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.deleteItem);
router.post('/:id/issue', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.issuePrescription);
router.post('/:id/void', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.voidPrescription);
router.post('/:id/reissue', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), prescriptionController.reissuePrescription);
router.get('/:id/pdf', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), prescriptionController.getPrescriptionPdf);
router.get('/:id/print', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist']), prescriptionController.getPrescriptionPdf);

module.exports = router;
