const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const pregnanciesService = require('./pregnancies.service');

const createPregnancy = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.createPregnancy(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Pregnancy created successfully.',
    data: pregnancy,
  });
});

const getPregnancyDetail = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.getPregnancyDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy detail fetched successfully.',
    data: pregnancy,
  });
});

const updatePregnancy = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.updatePregnancy(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy updated successfully.',
    data: pregnancy,
  });
});

const updatePregnancyHighRisk = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.updatePregnancyHighRisk(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy high-risk fields updated successfully.',
    data: pregnancy,
  });
});

const updatePregnancyMilestones = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.updatePregnancyMilestones(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy milestones updated successfully.',
    data: pregnancy,
  });
});


const getPregnancyMilestones = asyncHandler(async (req, res) => {
  const milestones = await pregnanciesService.getPregnancyMilestones(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy milestones fetched successfully.',
    data: milestones,
  });
});

const updatePregnancyMilestoneStatus = asyncHandler(async (req, res) => {
  const pregnancy = await pregnanciesService.updatePregnancyMilestoneStatus(
    req.params.id,
    req.params.milestoneCode,
    req.body,
    req.user || {},
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Pregnancy milestone status updated successfully.',
    data: pregnancy,
  });
});

module.exports = {
  createPregnancy,
  getPregnancyDetail,
  updatePregnancy,
  updatePregnancyHighRisk,
  updatePregnancyMilestones,
  getPregnancyMilestones,
  updatePregnancyMilestoneStatus,
};
