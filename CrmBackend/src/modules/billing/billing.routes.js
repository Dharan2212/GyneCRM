const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./billing.controller');
const {
  createInvoiceSchema,
  listInvoicesSchema,
  invoiceIdParamSchema,
  updateInvoiceSchema,
  addItemSchema,
  finalizeInvoiceSchema,
  recordPaymentSchema,
  invoicePdfSchema,
  sendInvoiceSchema,
} = require('./billing.validator');

const router = express.Router();

router.use(auth);

router.post(
  '/invoices',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(createInvoiceSchema),
  controller.createInvoice,
);

router.get(
  '/invoices',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(listInvoicesSchema, { source: 'query' }),
  controller.listInvoices,
);

router.get(
  '/invoices/:id/pdf',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoicePdfSchema, { source: 'params' }),
  controller.getInvoicePdf,
);


router.post(
  '/invoices/:id/items',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(addItemSchema),
  controller.addInvoiceItems,
);

router.patch(
  '/invoices/:id/items',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(addItemSchema),
  controller.addInvoiceItems,
);


router.post(
  '/invoices/:id/finalize',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(finalizeInvoiceSchema),
  controller.finalizeInvoice,
);

router.patch(
  '/invoices/:id/finalize',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(finalizeInvoiceSchema),
  controller.finalizeInvoice,
);


router.post(
  '/invoices/:id/payments',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(recordPaymentSchema),
  controller.recordPayment,
);

router.patch(
  '/invoices/:id/payments',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(recordPaymentSchema),
  controller.recordPayment,
);


router.post(
  '/invoices/:id/send',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(sendInvoiceSchema),
  controller.sendInvoice,
);

router.patch(
  '/invoices/:id/send',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(sendInvoiceSchema),
  controller.sendInvoice,
);

router.put(
  '/invoices/:id',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  validateRequest(updateInvoiceSchema),
  controller.updateInvoice,
);

router.get(
  '/invoices/:id',
  requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST),
  validateRequest(invoiceIdParamSchema, { source: 'params' }),
  controller.getInvoiceDetail,
);

module.exports = router;
