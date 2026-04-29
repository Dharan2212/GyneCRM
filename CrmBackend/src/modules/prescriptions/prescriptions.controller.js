const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const prescriptionsService = require('./prescriptions.service');

const createPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionsService.createPrescription(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Prescription created successfully.',
    data: prescription,
  });
});

const getPrescriptionDetail = asyncHandler(async (req, res) => {
  const prescription = await prescriptionsService.getPrescriptionDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Prescription detail fetched successfully.',
    data: prescription,
  });
});

const issuePrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionsService.issuePrescription(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Prescription issued successfully.',
    data: prescription,
  });
});

const voidPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionsService.voidPrescription(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Prescription voided successfully.',
    data: prescription,
  });
});

const getPrescriptionPdf = asyncHandler(async (req, res) => {
  const pdfPayload = await prescriptionsService.getPrescriptionPdf(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Prescription PDF foundation fetched successfully.',
    data: pdfPayload,
  });
});

const sendPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionsService.sendPrescription(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Prescription send state updated successfully.',
    data: prescription,
  });
});

module.exports = {
  createPrescription,
  getPrescriptionDetail,
  issuePrescription,
  voidPrescription,
  getPrescriptionPdf,
  sendPrescription,
};
