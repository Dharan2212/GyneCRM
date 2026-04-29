const Notification = require('../../models/Notification');
const SendHistory = require('../../models/SendHistory');
const Prescription = require('../../models/Prescription');
const TestOrder = require('../../models/TestOrder');
const PatientDocument = require('../../models/PatientDocument');
const Invoice = require('../../models/Invoice');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const {
  resolveHospitalId,
  normalizePagination,
  buildNotificationFilter,
  buildNotificationResponse,
  getScopedNotificationById,
} = require('./notifications.query');
const {
  initializeNotificationState,
  assertCancellableStatus,
} = require('./notifications.queue');

const SOURCE_MODEL_CONFIG = {
  prescription: {
    Model: Prescription,
    sourceNumberField: 'prescription_number',
  },
  test_order: {
    Model: TestOrder,
    sourceNumberField: 'test_order_number',
  },
  patient_document: {
    Model: PatientDocument,
    sourceNumberField: 'document_number',
  },
  invoice: {
    Model: Invoice,
    sourceNumberField: 'invoice_number',
  },
};

async function ensureScopedPatient(patientId, hospitalId) {
  if (!patientId) {
    return null;
  }

  const patient = await Patient.findOne({
    _id: patientId,
    hospital_id: hospitalId,
    is_deleted: false,
  }).select('_id').lean();

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  return patient;
}

async function ensureScopedDoctor(doctorId, hospitalId) {
  if (!doctorId) {
    return null;
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    hospital_id: hospitalId,
  }).select('_id user_id hospital_id').lean();

  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  return doctor;
}

async function ensureScopedSendHistory(sendHistoryId, hospitalId) {
  if (!sendHistoryId) {
    return null;
  }

  const record = await SendHistory.findOne({
    _id: sendHistoryId,
    hospital_id: hospitalId,
  }).select('_id').lean();

  if (!record) {
    throw new AppError('Send history record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

async function resolveSourceRecord(sourceType, sourceId, hospitalId) {
  const sourceConfig = SOURCE_MODEL_CONFIG[sourceType];

  if (!sourceConfig) {
    throw new AppError('Unsupported source type.', HTTP_STATUS.BAD_REQUEST);
  }

  const record = await sourceConfig.Model.findOne({
    _id: sourceId,
    hospital_id: hospitalId,
  }).lean();

  if (!record) {
    throw new AppError('Linked source record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return {
    record,
    sourceNumber: sourceConfig.sourceNumberField ? record[sourceConfig.sourceNumberField] || null : null,
  };
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function buildSourceNumber(sourceType, record, explicitSourceNumber) {
  if (explicitSourceNumber) {
    return explicitSourceNumber;
  }

  if (!record) {
    return null;
  }

  const recordId = record._id ? String(record._id).slice(-6).toUpperCase() : null;

  if (sourceType === 'test_order') {
    return normalizeOptionalString(record.test_order_number) || recordId;
  }

  if (sourceType === 'patient_document') {
    return normalizeOptionalString(record.document_number) || normalizeOptionalString(record.title) || recordId;
  }

  if (sourceType === 'prescription') {
    return normalizeOptionalString(record.prescription_number) || recordId;
  }

  if (sourceType === 'invoice') {
    return normalizeOptionalString(record.invoice_number) || recordId;
  }

  return recordId;
}

async function createNotification(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id || null;
  const { record: sourceRecord, sourceNumber } = await resolveSourceRecord(payload.source_type, payload.source_id, hospitalId);

  const resolvedPatientId = payload.patient_id || sourceRecord.patient_id || null;
  const resolvedDoctorId = sourceRecord.doctor_id || payload.doctor_id || null;

  if (payload.patient_id && sourceRecord.patient_id && String(payload.patient_id) !== String(sourceRecord.patient_id)) {
    throw new AppError('patient_id must match the linked source record.', HTTP_STATUS.CONFLICT);
  }

  if (payload.doctor_id && sourceRecord.doctor_id && String(payload.doctor_id) !== String(sourceRecord.doctor_id)) {
    throw new AppError('doctor_id must match the linked source record.', HTTP_STATUS.CONFLICT);
  }

  if (['patient', 'family'].includes(payload.recipient_type || 'patient') && !resolvedPatientId) {
    throw new AppError('patient_id is required for patient-facing notifications.', HTTP_STATUS.BAD_REQUEST);
  }

  await ensureScopedPatient(resolvedPatientId, hospitalId);
  await ensureScopedDoctor(resolvedDoctorId, hospitalId);
  await ensureScopedSendHistory(payload.send_history_id, hospitalId);

  const queueState = initializeNotificationState(payload);

  const notification = await Notification.create({
    hospital_id: hospitalId,
    patient_id: resolvedPatientId,
    doctor_id: resolvedDoctorId,
    source_type: payload.source_type,
    source_id: payload.source_id,
    source_number: buildSourceNumber(payload.source_type, sourceRecord, payload.source_number || sourceNumber),
    channel: payload.channel,
    recipient: String(payload.recipient).trim(),
    recipient_type: payload.recipient_type || 'patient',
    subject: normalizeOptionalString(payload.subject),
    body_summary: normalizeOptionalString(payload.body_summary),
    template_key: normalizeOptionalString(payload.template_key),
    payload_snapshot: payload.payload_snapshot ?? null,
    priority: payload.priority || 'normal',
    queue_name: queueState.queue_name,
    queue_key: queueState.queue_key,
    status: queueState.status,
    scheduled_for: queueState.scheduled_for,
    available_at: queueState.available_at,
    requested_at: queueState.requested_at,
    expires_at: payload.expires_at || null,
    provider: normalizeOptionalString(payload.provider) || 'internal',
    attempt_count: queueState.attempt_count,
    max_attempts: queueState.max_attempts,
    initiated_by: actorId,
    metadata: payload.metadata ?? null,
    send_history_id: payload.send_history_id || null,
    is_active: true,
  });

  const detail = await getScopedNotificationById(notification._id, hospitalId);
  return buildNotificationResponse(detail.toObject ? detail.toObject() : detail);
}

async function listNotifications(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildNotificationFilter(query, hospitalId);

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .populate(require('./notifications.query').LIST_POPULATE)
      .sort({ scheduled_for: -1, available_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    records: rows.map(buildNotificationResponse),
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getNotificationDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const record = await getScopedNotificationById(id, hospitalId);
  return buildNotificationResponse(record.toObject ? record.toObject() : record);
}

async function cancelNotification(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id || null;
  const record = await getScopedNotificationById(id, hospitalId);

  assertCancellableStatus(record);

  record.status = 'cancelled';
  record.cancelled_at = new Date();
  record.is_active = false;
  record.last_error_code = null;
  record.last_error_message = null;
  record.metadata = {
    ...(record.metadata || {}),
    cancelled_by: actorId,
  };

  await record.save();
  const saved = await getScopedNotificationById(record._id, hospitalId);
  return buildNotificationResponse(saved.toObject ? saved.toObject() : saved);
}

module.exports = {
  createNotification,
  listNotifications,
  getNotificationDetail,
  cancelNotification,
};
