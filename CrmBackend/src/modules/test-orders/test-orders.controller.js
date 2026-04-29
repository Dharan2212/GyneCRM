const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const service = require('./test-orders.service');


const listTestOrders = asyncHandler(async (req, res) => {
  const result = await service.listTestOrders(req.query, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test orders fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const getTestOrderDetail = asyncHandler(async (req, res) => {
  const result = await service.getTestOrderDetail(req.params.id, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test order detail fetched successfully.',
    data: result,
  });
});

const getPendingUploadList = asyncHandler(async (req, res) => {
  const result = await service.listPendingUpload(req.query, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pending upload test orders fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const createTestOrder = asyncHandler(async (req, res) => {
  const result = await service.createTestOrder(req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Test order created successfully.',
    data: result,
  });
});

const moveToPendingUpload = asyncHandler(async (req, res) => {
  const result = await service.moveToPendingUpload(req.params.id, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test order moved to pending upload successfully.',
    data: result,
  });
});

const linkResult = asyncHandler(async (req, res) => {
  const result = await service.linkResult(req.params.id, req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test result linked successfully.',
    data: result,
  });
});

const getReviewInbox = asyncHandler(async (req, res) => {
  const result = await service.getReviewInbox(req.query, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Review inbox fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const reviewResult = asyncHandler(async (req, res) => {
  const result = await service.reviewResult(req.params.id, req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test result reviewed successfully.',
    data: result,
  });
});

const sendResult = asyncHandler(async (req, res) => {
  const result = await service.sendResult(req.params.id, req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Test result send state updated successfully.',
    data: result,
  });
});

module.exports = {
  listTestOrders,
  getTestOrderDetail,
  getPendingUploadList,
  createTestOrder,
  moveToPendingUpload,
  linkResult,
  getReviewInbox,
  reviewResult,
  sendResult,
};
