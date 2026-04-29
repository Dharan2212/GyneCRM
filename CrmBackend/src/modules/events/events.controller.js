const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const eventsService = require('./events.service');

const dispatchEvent = asyncHandler(async (req, res) => {
  const event = await eventsService.dispatchEvent(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Event dispatched successfully.',
    data: event,
  });
});

const listEvents = asyncHandler(async (req, res) => {
  const result = await eventsService.listEvents(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Events fetched successfully.',
    data: result.records,
    meta: result.meta,
  });
});

const getEventDetail = asyncHandler(async (req, res) => {
  const event = await eventsService.getEventDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Event detail fetched successfully.',
    data: event,
  });
});

const getEventTypes = asyncHandler(async (req, res) => {
  const records = eventsService.listEventTypes();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Event types fetched successfully.',
    data: records,
  });
});

const getTemplateMap = asyncHandler(async (req, res) => {
  const records = eventsService.listTemplateMap();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Event template map fetched successfully.',
    data: records,
  });
});

module.exports = {
  dispatchEvent,
  listEvents,
  getEventDetail,
  getEventTypes,
  getTemplateMap,
};
