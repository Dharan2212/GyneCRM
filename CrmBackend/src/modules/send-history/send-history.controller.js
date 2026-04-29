const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const sendHistoryService = require('./send-history.service');

const listSendHistory = asyncHandler(async (req, res) => {
  const result = await sendHistoryService.listSendHistory(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Send history fetched successfully.',
    data: result.records,
    meta: result.meta,
  });
});

const getSendHistoryDetail = asyncHandler(async (req, res) => {
  const record = await sendHistoryService.getSendHistoryDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Send history detail fetched successfully.',
    data: record,
  });
});

const getPatientSendHistory = asyncHandler(async (req, res) => {
  const patientId = req.params.id || req.params.patientId;
  const result = await sendHistoryService.getPatientSendHistory(patientId, req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient send history fetched successfully.',
    data: result.records,
    meta: result.meta,
  });
});

module.exports = {
  listSendHistory,
  getSendHistoryDetail,
  getPatientSendHistory,
};
