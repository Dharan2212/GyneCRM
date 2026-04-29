const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const billingService = require('./billing.service');

const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Invoice created successfully.',
    data: invoice,
  });
});

const listInvoices = asyncHandler(async (req, res) => {
  const result = await billingService.listInvoices(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoices fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const getInvoiceDetail = asyncHandler(async (req, res) => {
  const invoice = await billingService.getInvoiceDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice detail fetched successfully.',
    data: invoice,
  });
});

const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.updateInvoice(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice updated successfully.',
    data: invoice,
  });
});

const addInvoiceItems = asyncHandler(async (req, res) => {
  const invoice = await billingService.addInvoiceItems(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice items updated successfully.',
    data: invoice,
  });
});

const finalizeInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.finalizeInvoice(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice finalized successfully.',
    data: invoice,
  });
});

const recordPayment = asyncHandler(async (req, res) => {
  const invoice = await billingService.recordPayment(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice payment recorded successfully.',
    data: invoice,
  });
});

const getInvoicePdf = asyncHandler(async (req, res) => {
  const payload = await billingService.getInvoicePdf(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice PDF foundation fetched successfully.',
    data: payload,
  });
});

const sendInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.sendInvoice(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Invoice send state updated successfully.',
    data: invoice,
  });
});

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceDetail,
  updateInvoice,
  addInvoiceItems,
  finalizeInvoice,
  recordPayment,
  getInvoicePdf,
  sendInvoice,
};
