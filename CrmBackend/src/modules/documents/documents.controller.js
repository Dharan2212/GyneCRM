const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const service = require('./documents.service');


const getReviewInbox = asyncHandler(async (req, res) => {
  const result = await service.listReviewInbox(req.query, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Document review inbox fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const reviewDocument = asyncHandler(async (req, res) => {
  const result = await service.reviewDocument(req.params.id, req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Document reviewed successfully.',
    data: result,
  });
});

const flagDocument = asyncHandler(async (req, res) => {
  const result = await service.flagDocument(req.params.id, req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Document flag updated successfully.',
    data: result,
  });
});

const getUploadUrlFoundation = asyncHandler(async (req, res) => {
  const result = await service.getUploadUrlFoundation(req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Upload URL foundation generated successfully.',
    data: result,
  });
});


const getDocumentUrl = asyncHandler(async (req, res) => {
  const result = await service.getDocumentAccessUrl(req.params.id, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Document access foundation fetched successfully.',
    data: result,
  });
});

const createDocument = asyncHandler(async (req, res) => {
  const result = await service.createDocument(req.body, req.user || {});
  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Patient document created successfully.',
    data: result,
  });
});

module.exports = {
  getReviewInbox,
  reviewDocument,
  flagDocument,
  getUploadUrlFoundation,
  getDocumentUrl,
  createDocument,
};
