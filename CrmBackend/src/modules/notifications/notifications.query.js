const Notification = require('../../models/Notification');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');

const SOURCE_TYPE_ENUM = ['prescription', 'test_order', 'patient_document', 'invoice'];
const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];
const STATUS_ENUM = ['queued', 'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'dead_letter'];
const RECIPIENT_TYPE_ENUM = ['patient', 'family', 'doctor', 'other'];

const LIST_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code phone category family_whatsapp' },
  { path: 'doctor_id', select: '_id full_name speciality qualification' },
  { path: 'initiated_by', select: '_id full_name role' },
  { path: 'send_history_id', select: '_id source_type source_id source_number channel status requested_at sent_at delivered_at failed_at' },
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

function buildNotificationFilter(query = {}, hospitalId) {
  const filter = {
    hospital_id: hospitalId,
  };

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.source_type) {
    filter.source_type = query.source_type;
  }

  if (query.channel) {
    filter.channel = query.channel;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.status) {
    filter.status = query.status;
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

function buildNotificationResponse(record) {
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

  const sendHistorySummary = record.send_history_id && typeof record.send_history_id === 'object'
    ? {
        _id: record.send_history_id._id,
        source_type: record.send_history_id.source_type,
        source_id: record.send_history_id.source_id,
        source_number: record.send_history_id.source_number,
        channel: record.send_history_id.channel,
        status: record.send_history_id.status,
        requested_at: record.send_history_id.requested_at,
        sent_at: record.send_history_id.sent_at,
        delivered_at: record.send_history_id.delivered_at,
        failed_at: record.send_history_id.failed_at,
      }
    : null;

  return {
    ...record,
    patient_summary: patientSummary,
    doctor_summary: doctorSummary,
    initiated_by_summary: initiatedBySummary,
    send_history_summary: sendHistorySummary,
    source_summary: {
      source_type: record.source_type,
      source_id: record.source_id,
      source_number: record.source_number,
    },
  };
}

async function getScopedNotificationById(id, hospitalId) {
  assertObjectId(id, 'notification id');

  const record = await Notification.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE);

  if (!record) {
    throw new AppError('Notification record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

module.exports = {
  SOURCE_TYPE_ENUM,
  CHANNEL_ENUM,
  PRIORITY_ENUM,
  STATUS_ENUM,
  RECIPIENT_TYPE_ENUM,
  LIST_POPULATE,
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildNotificationFilter,
  buildNotificationResponse,
  getScopedNotificationById,
};
