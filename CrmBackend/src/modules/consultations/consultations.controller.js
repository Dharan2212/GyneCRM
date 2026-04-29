const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const consultationsService = require('./consultations.service');

const createConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationsService.createConsultation(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Consultation created successfully.',
    data: consultation,
  });
});

const getConsultationDetail = asyncHandler(async (req, res) => {
  const consultation = await consultationsService.getConsultationDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation detail fetched successfully.',
    data: consultation,
  });
});

const updateConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationsService.updateConsultation(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation updated successfully.',
    data: consultation,
  });
});

const updateConsultationStatus = asyncHandler(async (req, res) => {
  const consultation = await consultationsService.updateConsultationStatus(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation status updated successfully.',
    data: consultation,
  });
});

const finaliseConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationsService.finaliseConsultation(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation finalised successfully.',
    data: consultation,
  });
});


const getConsultationPdf = asyncHandler(async (req, res) => {
  const result = await service.getConsultationPdf(req.params.id, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation PDF foundation fetched successfully.',
    data: result,
  });
});

const getConsultationWorkspace = asyncHandler(async (req, res) => {
  const workspace = await consultationsService.getConsultationWorkspace(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation workspace fetched successfully.',
    data: workspace,
  });
});

const listFollowUps = asyncHandler(async (req, res) => {
  const result = await consultationsService.listFollowUps(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Follow-ups fetched successfully.',
    data: result.follow_ups,
    meta: result.meta,
  });
});

const getConsultationFollowUp = asyncHandler(async (req, res) => {
  const followUp = await consultationsService.getConsultationFollowUp(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Consultation follow-up fetched successfully.',
    data: followUp,
  });
});

const updateFollowUpStatus = asyncHandler(async (req, res) => {
  const followUp = await consultationsService.updateFollowUpStatus(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Follow-up status updated successfully.',
    data: followUp,
  });
});

module.exports = {
  createConsultation,
  getConsultationDetail,
  getConsultationPdf,
  updateConsultation,
  updateConsultationStatus,
  finaliseConsultation,
  getConsultationWorkspace,
  listFollowUps,
  getConsultationFollowUp,
  updateFollowUpStatus,
};
