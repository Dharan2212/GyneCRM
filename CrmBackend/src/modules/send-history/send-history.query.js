const SendHistory = require('../../models/SendHistory');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');

const SOURCE_TYPE_ENUM = ['prescription', 'test_order', 'patient_document', 'invoice'];
const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const STATUS_ENUM = ['requested', 'queued', 'sent', 'delivered', 'failed', 'cancelled'];

const LIST_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code phone category family_whatsapp' },
  { path: 'doctor_id', select: '_id full_name speciality qualification' },
  { path: 'initiated_by', select: '_id full_name role' },
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

function buildSendHistoryFilter(query = {}, hospitalId, overrides = {}) {
  const filter = {
    hospital_id: hospitalId,
    ...overrides,
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

  if (query.status) {
    filter.status = query.status;
  }

  if (query.requested_from || query.requested_to) {
    filter.requested_at = {};

    if (query.requested_from) {
      filter.requested_at.$gte = new Date(query.requested_from);
    }

    if (query.requested_to) {
      filter.requested_at.$lte = new Date(query.requested_to);
    }
  }

  return filter;
}

function buildSendHistoryResponse(record) {
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

  return {
    ...record,
    patient_summary: patientSummary,
    doctor_summary: doctorSummary,
    initiated_by_summary: initiatedBySummary,
    source_summary: {
      source_type: record.source_type,
      source_id: record.source_id,
      source_number: record.source_number,
    },
  };
}

async function getScopedSendHistoryById(id, hospitalId) {
  assertObjectId(id, 'send history id');

  const record = await SendHistory.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE).lean();

  if (!record) {
    throw new AppError('Send history record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

module.exports = {
  SOURCE_TYPE_ENUM,
  CHANNEL_ENUM,
  STATUS_ENUM,
  LIST_POPULATE,
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildSendHistoryFilter,
  buildSendHistoryResponse,
  getScopedSendHistoryById,
};
