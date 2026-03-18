'use strict';

const express = require('express');
const router = express.Router();
const invoiceController = require('./invoice.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

router.post('/', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.createInvoice);
router.get('/', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.listInvoices);
router.get('/:id', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.getInvoice);
router.put('/:id', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.updateInvoice);
router.post('/:id/items', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.addItem);
router.delete('/:id/items/:itemId', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.removeItem);
router.post('/:id/finalize', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.finalizeInvoice);
router.post('/:id/payments', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.recordPayment);
router.post('/:id/refund', authenticate, enforceHospitalScope, roleCheck(['admin']), invoiceController.refundInvoice);
router.post('/:id/void', authenticate, enforceHospitalScope, roleCheck(['admin']), invoiceController.voidInvoice);
router.get('/:id/pdf', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist']), invoiceController.getInvoicePdf);

module.exports = router;
