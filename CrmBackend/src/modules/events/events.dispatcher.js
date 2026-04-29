const Notification = require('../../models/Notification');
const Prescription = require('../../models/Prescription');
const TestOrder = require('../../models/TestOrder');
const PatientDocument = require('../../models/PatientDocument');
const Invoice = require('../../models/Invoice');
const Appointment = require('../../models/Appointment');
const FollowUp = require('../../models/FollowUp');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { initializeNotificationState } = require('../notifications/notifications.queue');
const { getEventDefinition } = require('./events.types');
const { getTemplateMapEntry } = require('./events.template-map');
const { buildRecipientSnapshot, dedupeChannels } = require('./events.mapper');

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
  appointment: {
    Model: Appointment,
    sourceNumberField: null,
  },
  follow_up: {
    Model: FollowUp,
    sourceNumberField: null,
  },
};

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

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

function resolveChannels(payload = {}, templateEntry = {}) {
  return dedupeChannels(payload.channels && payload.channels.length ? payload.channels : templateEntry.default_channels || []);
}

function resolveDispatchMode(payload = {}) {
  return payload.dispatch_mode || 'queue_only';
}

function resolveEventStatus(dispatchMode, queueEnabled, queuedCount) {
  if (queuedCount > 0) {
    return 'queued';
  }

  if (dispatchMode === 'log_only') {
    return 'ignored';
  }

  if (!queueEnabled) {
    return 'mapped';
  }

  return 'received';
}

async function createNotificationRecords({ hospitalId, event, templateEntry, currentUser }) {
  if (!templateEntry.queue_enabled) {
    return [];
  }

  if (!['queue_only', 'queue_and_log'].includes(event.dispatch_mode)) {
    return [];
  }

  const channels = resolveChannels(event, templateEntry);
  if (channels.length === 0) {
    return [];
  }

  const now = new Date();
  const docs = channels.map((channel) => {
    const queueState = initializeNotificationState({
      source_type: event.source_type,
      source_id: event.source_id,
      channel,
      scheduled_for: event.metadata?.scheduled_for || null,
      queue_name: event.metadata?.queue_name || 'events_outbound',
      queue_key: event.metadata?.queue_key || null,
      max_attempts: event.metadata?.max_attempts || 3,
    });

    return {
      hospital_id: hospitalId,
      patient_id: event.patient_id || null,
      doctor_id: event.doctor_id || null,
      source_type: event.source_type,
      source_id: event.source_id,
      source_number: event.source_number || null,
      channel,
      recipient: normalizeOptionalString(event.recipient_snapshot?.recipient) || 'pending',
      recipient_type: event.recipient_snapshot?.recipient_type || (templateEntry.recipient_strategy === 'doctor_only' ? 'doctor' : 'patient'),
      subject: event.template_key,
      body_summary: normalizeOptionalString(event.payload_snapshot?.body_summary) || null,
      template_key: event.template_key || null,
      payload_snapshot: event.payload_snapshot || null,
      priority: event.metadata?.priority || 'normal',
      status: queueState.status,
      queue_name: queueState.queue_name,
      queue_key: queueState.queue_key,
      scheduled_for: queueState.scheduled_for,
      available_at: queueState.available_at,
      provider: 'internal',
      attempt_count: queueState.attempt_count,
      max_attempts: queueState.max_attempts,
      initiated_by: currentUser.id || null,
      metadata: {
        ...event.metadata,
        event_id: event._id,
        event_type: event.event_type,
      },
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };
  });

  return Notification.insertMany(docs, { ordered: true });
}

function validateEventTemplateCompatibility(eventType, sourceType) {
  const definition = getEventDefinition(eventType);

  if (!definition) {
    throw new AppError('Unsupported event_type.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!definition.allowed_source_types.includes(sourceType)) {
    throw new AppError('event_type is not compatible with the supplied source_type.', HTTP_STATUS.BAD_REQUEST);
  }

  return definition;
}

module.exports = {
  normalizeOptionalString,
  ensureScopedPatient,
  ensureScopedDoctor,
  resolveSourceRecord,
  resolveChannels,
  resolveDispatchMode,
  resolveEventStatus,
  createNotificationRecords,
  validateEventTemplateCompatibility,
  getTemplateMapEntry,
  buildRecipientSnapshot,
};
