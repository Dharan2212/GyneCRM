const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const notificationsService = require('./notifications.service');

const createNotification = asyncHandler(async (req, res) => {
  const notification = await notificationsService.createNotification(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Notification queued successfully.',
    data: notification,
  });
});

const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationsService.listNotifications(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Notifications fetched successfully.',
    data: result.records,
    meta: result.meta,
  });
});

const getNotificationDetail = asyncHandler(async (req, res) => {
  const notification = await notificationsService.getNotificationDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Notification detail fetched successfully.',
    data: notification,
  });
});

const cancelNotification = asyncHandler(async (req, res) => {
  const notification = await notificationsService.cancelNotification(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Notification cancelled successfully.',
    data: notification,
  });
});

module.exports = {
  createNotification,
  listNotifications,
  getNotificationDetail,
  cancelNotification,
};
