const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');

function buildQueueKey(payload = {}) {
  if (payload.queue_key) {
    return String(payload.queue_key).trim();
  }

  return [payload.source_type, payload.channel, payload.source_id].filter(Boolean).join(':');
}

function initializeNotificationState(payload = {}) {
  const now = new Date();
  const hasFutureSchedule = payload.scheduled_for && new Date(payload.scheduled_for).getTime() > now.getTime();
  const scheduledFor = payload.scheduled_for ? new Date(payload.scheduled_for) : null;

  return {
    status: hasFutureSchedule ? 'scheduled' : 'queued',
    scheduled_for: scheduledFor,
    available_at: hasFutureSchedule ? scheduledFor : now,
    queue_name: payload.queue_name ? String(payload.queue_name).trim() : 'notifications_outbound',
    queue_key: buildQueueKey(payload),
    attempt_count: 0,
    max_attempts: Number.isFinite(Number(payload.max_attempts)) ? Number(payload.max_attempts) : 3,
    requested_at: now,
  };
}

function assertCancellableStatus(notification) {
  if (!notification) {
    throw new AppError('Notification not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!['queued', 'scheduled'].includes(notification.status)) {
    throw new AppError('Only queued or scheduled notifications can be cancelled.', HTTP_STATUS.CONFLICT);
  }
}

module.exports = {
  buildQueueKey,
  initializeNotificationState,
  assertCancellableStatus,
};
