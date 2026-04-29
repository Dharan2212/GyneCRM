const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const jobsService = require('./jobs.service');

const dispatchJob = asyncHandler(async (req, res) => {
  const job = await jobsService.dispatchJob(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Job dispatched successfully.',
    data: job,
  });
});

const runJob = asyncHandler(async (req, res) => {
  const job = await jobsService.runJob(req.params.jobType, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Job executed successfully.',
    data: job,
  });
});

const listJobs = asyncHandler(async (req, res) => {
  const result = await jobsService.listJobs(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Jobs fetched successfully.',
    data: result.records,
    meta: result.meta,
  });
});

const getJobDetail = asyncHandler(async (req, res) => {
  const job = await jobsService.getJobDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Job detail fetched successfully.',
    data: job,
  });
});

const cancelJob = asyncHandler(async (req, res) => {
  const job = await jobsService.cancelJob(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Job cancelled successfully.',
    data: job,
  });
});

const listJobTypes = asyncHandler(async (req, res) => {
  const records = jobsService.listJobTypes();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Job types fetched successfully.',
    data: records,
  });
});

module.exports = {
  dispatchJob,
  runJob,
  listJobs,
  getJobDetail,
  cancelJob,
  listJobTypes,
};
