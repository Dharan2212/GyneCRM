const Job = require('../../models/Job');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');
const { JOB_TYPE_VALUES, JOB_STATUS_VALUES } = require('./jobs.types');

const LIST_POPULATE = [
  { path: 'triggered_by', select: '_id full_name role' },
  { path: 'related_event_ids', select: '_id event_type source_type source_id status dispatch_requested_at queued_notification_ids' },
  { path: 'related_notification_ids', select: '_id source_type source_id channel status queue_name available_at scheduled_for attempt_count max_attempts' },
  { path: 'related_send_history_ids', select: '_id source_type source_id channel status requested_at sent_at failed_at' },
];

const DETAIL_POPULATE = LIST_POPULATE;

function resolveHospitalId(inputHospitalId, currentUser = {}) {
  const hospitalId = inputHospitalId || currentUser.hospital_id || currentUser.raw?.hospital_id;

  if (!hospitalId || !isValidObjectId(hospitalId)) {
    throw new AppError('Valid hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  return hospitalId;
}

function normalizePagination(query = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function buildJobFilter(query = {}, hospitalId) {
  const filter = { hospital_id: hospitalId };

  if (query.job_type) {
    filter.job_type = query.job_type;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.scope_date) {
    const scopeDate = new Date(query.scope_date);
    const start = new Date(scopeDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(scopeDate);
    end.setHours(23, 59, 59, 999);
    filter.scope_date = { $gte: start, $lte: end };
  }

  if (query.scheduled_from || query.scheduled_to) {
    filter.scheduled_for = {};

    if (query.scheduled_from) {
      filter.scheduled_for.$gte = new Date(query.scheduled_from);
    }

    if (query.scheduled_to) {
      filter.scheduled_for.$lte = new Date(query.scheduled_to);
    }
  }

  return filter;
}

function buildJobResponse(record) {
  if (!record) {
    return null;
  }

  const triggeredBySummary = record.triggered_by && typeof record.triggered_by === 'object'
    ? {
        _id: record.triggered_by._id,
        full_name: record.triggered_by.full_name,
        role: record.triggered_by.role,
      }
    : null;

  const relatedEvents = Array.isArray(record.related_event_ids)
    ? record.related_event_ids.map((item) => ({
        _id: item._id,
        event_type: item.event_type,
        source_type: item.source_type,
        source_id: item.source_id,
        status: item.status,
        dispatch_requested_at: item.dispatch_requested_at,
        queued_notification_count: Array.isArray(item.queued_notification_ids) ? item.queued_notification_ids.length : 0,
      }))
    : [];

  const relatedNotifications = Array.isArray(record.related_notification_ids)
    ? record.related_notification_ids.map((item) => ({
        _id: item._id,
        source_type: item.source_type,
        source_id: item.source_id,
        channel: item.channel,
        status: item.status,
        queue_name: item.queue_name,
        available_at: item.available_at,
        scheduled_for: item.scheduled_for,
        attempt_count: item.attempt_count,
        max_attempts: item.max_attempts,
      }))
    : [];

  const relatedSendHistory = Array.isArray(record.related_send_history_ids)
    ? record.related_send_history_ids.map((item) => ({
        _id: item._id,
        source_type: item.source_type,
        source_id: item.source_id,
        channel: item.channel,
        status: item.status,
        requested_at: item.requested_at,
        sent_at: item.sent_at,
        failed_at: item.failed_at,
      }))
    : [];

  return {
    ...record,
    triggered_by_summary: triggeredBySummary,
    related_events_summary: relatedEvents,
    related_notifications_summary: relatedNotifications,
    related_send_history_summary: relatedSendHistory,
  };
}

async function getScopedJobById(id, hospitalId) {
  assertObjectId(id, 'job id');

  const record = await Job.findOne({ _id: id, hospital_id: hospitalId }).populate(DETAIL_POPULATE);

  if (!record) {
    throw new AppError('Job record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

module.exports = {
  JOB_TYPE_VALUES,
  JOB_STATUS_VALUES,
  LIST_POPULATE,
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildJobFilter,
  buildJobResponse,
  getScopedJobById,
};
