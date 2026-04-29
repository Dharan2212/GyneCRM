const Event = require('../../models/Event');
const Notification = require('../../models/Notification');
const SendHistory = require('../../models/SendHistory');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');
const { EVENT_TYPE_VALUES, SOURCE_TYPE_VALUES } = require('./events.types');

const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const STATUS_ENUM = ['received', 'mapped', 'queued', 'ignored', 'failed'];
const DISPATCH_MODE_ENUM = ['queue_only', 'queue_and_log', 'log_only'];

const LIST_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code phone category family_whatsapp' },
  { path: 'doctor_id', select: '_id full_name speciality qualification' },
  { path: 'initiated_by', select: '_id full_name role' },
  { path: 'queued_notification_ids', select: '_id source_type source_id channel status queue_name available_at scheduled_for' },
  { path: 'send_history_ids', select: '_id source_type source_id channel status requested_at sent_at delivered_at failed_at' },
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

function buildEventFilter(query = {}, hospitalId) {
  const filter = { hospital_id: hospitalId };

  if (query.event_type) {
    filter.event_type = query.event_type;
  }

  if (query.source_type) {
    filter.source_type = query.source_type;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.requested_from || query.requested_to) {
    filter.dispatch_requested_at = {};

    if (query.requested_from) {
      filter.dispatch_requested_at.$gte = new Date(query.requested_from);
    }

    if (query.requested_to) {
      filter.dispatch_requested_at.$lte = new Date(query.requested_to);
    }
  }

  return filter;
}

function buildEventResponse(record) {
  if (!record) {
    return null;
  }

  const patientSummary = record.patient_id && typeof record.patient_id === 'object'
    ? {
        _id: record.patient_id._id,
        full_name: record.patient_id.full_name,
        patient_code: record.patient_id.patient_code,
        phone: record.patient_id.phone,
        family_whatsapp: record.patient_id.family_whatsapp,
        category: record.patient_id.category,
      }
    : null;

  const doctorSummary = record.doctor_id && typeof record.doctor_id === 'object'
    ? {
        _id: record.doctor_id._id,
        full_name: record.doctor_id.full_name,
        speciality: record.doctor_id.speciality,
        qualification: record.doctor_id.qualification,
      }
    : null;

  const initiatedBySummary = record.initiated_by && typeof record.initiated_by === 'object'
    ? {
        _id: record.initiated_by._id,
        full_name: record.initiated_by.full_name,
        role: record.initiated_by.role,
      }
    : null;

  const queuedNotifications = Array.isArray(record.queued_notification_ids)
    ? record.queued_notification_ids.map((item) => ({
        _id: item._id,
        source_type: item.source_type,
        source_id: item.source_id,
        channel: item.channel,
        status: item.status,
        queue_name: item.queue_name,
        scheduled_for: item.scheduled_for,
        available_at: item.available_at,
      }))
    : [];

  const sendHistory = Array.isArray(record.send_history_ids)
    ? record.send_history_ids.map((item) => ({
        _id: item._id,
        source_type: item.source_type,
        source_id: item.source_id,
        channel: item.channel,
        status: item.status,
        requested_at: item.requested_at,
        sent_at: item.sent_at,
        delivered_at: item.delivered_at,
        failed_at: item.failed_at,
      }))
    : [];

  return {
    ...record,
    patient_summary: patientSummary,
    doctor_summary: doctorSummary,
    initiated_by_summary: initiatedBySummary,
    queued_notifications_summary: queuedNotifications,
    send_history_summary: sendHistory,
  };
}

async function getScopedEventById(id, hospitalId) {
  assertObjectId(id, 'event id');

  const record = await Event.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE);

  if (!record) {
    throw new AppError('Event record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

module.exports = {
  EVENT_TYPE_VALUES,
  SOURCE_TYPE_VALUES,
  CHANNEL_ENUM,
  STATUS_ENUM,
  DISPATCH_MODE_ENUM,
  LIST_POPULATE,
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildEventFilter,
  buildEventResponse,
  getScopedEventById,
};
