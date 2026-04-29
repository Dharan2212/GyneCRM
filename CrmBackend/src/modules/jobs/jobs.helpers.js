const Event = require('../../models/Event');
const Notification = require('../../models/Notification');
const Patient = require('../../models/Patient');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { getTemplateMapEntry } = require('../events/events.template-map');
const {
  validateEventTemplateCompatibility,
  resolveChannels,
  resolveDispatchMode,
  createNotificationRecords,
  resolveEventStatus,
} = require('../events/events.dispatcher');

function getScopeDayParts(scopeDate = new Date()) {
  const base = scopeDate ? new Date(scopeDate) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function buildQueueKey(jobType, hospitalId, scopeDate) {
  const scopePart = scopeDate ? new Date(scopeDate).toISOString().slice(0, 10) : 'none';
  return [jobType, hospitalId, scopePart].join(':');
}

function normalizeJobScheduling(payload = {}) {
  const now = new Date();
  const scheduledFor = payload.scheduled_for ? new Date(payload.scheduled_for) : null;
  const isFuture = scheduledFor && scheduledFor.getTime() > now.getTime();

  return {
    status: isFuture ? 'scheduled' : 'queued',
    scheduled_for: scheduledFor,
    available_at: isFuture ? scheduledFor : now,
    run_mode: payload.run_mode || (isFuture ? 'scheduled' : 'manual'),
  };
}

async function resolvePatientContactSnapshot(patientId, channel) {
  if (!patientId) {
    return null;
  }

  const patient = await Patient.findById(patientId)
    .select('_id full_name patient_code phone family_whatsapp')
    .lean();

  if (!patient) {
    return null;
  }

  let recipient = null;
  if (channel === 'whatsapp') {
    recipient = patient.family_whatsapp || patient.phone || null;
  } else if (channel === 'sms' || channel === 'manual' || channel === 'print') {
    recipient = patient.phone || patient.family_whatsapp || null;
  }

  return {
    recipient,
    recipient_type: 'patient',
    patient_id: patient._id,
    patient_name: patient.full_name,
    patient_code: patient.patient_code,
  };
}

async function createEventAndNotifications({
  hospitalId,
  eventType,
  sourceType,
  sourceId,
  patientId = null,
  doctorId = null,
  sourceNumber = null,
  payloadSnapshot = null,
  metadata = null,
  currentUser = {},
}) {
  validateEventTemplateCompatibility(eventType, sourceType);
  const templateEntry = getTemplateMapEntry(eventType);

  if (!templateEntry) {
    throw new AppError('Template mapping not found for event_type.', HTTP_STATUS.BAD_REQUEST);
  }

  const channels = resolveChannels({}, templateEntry);
  let recipientSnapshot = null;

  if (channels.length > 0) {
    recipientSnapshot = await resolvePatientContactSnapshot(patientId, channels[0]);
  }

  if (templateEntry.queue_enabled && (!recipientSnapshot || !recipientSnapshot.recipient)) {
    return {
      event: null,
      notifications: [],
      skipped_reason: 'No eligible recipient contact was found for the event channels.',
    };
  }

  const event = await Event.create({
    hospital_id: hospitalId,
    patient_id: patientId,
    doctor_id: doctorId,
    source_type: sourceType,
    source_id: sourceId,
    source_number: sourceNumber,
    event_type: eventType,
    template_key: templateEntry.template_key,
    template_version: 1,
    channels,
    recipient_snapshot: recipientSnapshot,
    payload_snapshot: payloadSnapshot,
    status: 'received',
    dispatch_mode: resolveDispatchMode({ dispatch_mode: 'queue_only' }),
    dispatch_requested_at: new Date(),
    dispatch_started_at: new Date(),
    initiated_by: currentUser.id || null,
    metadata: metadata || null,
    is_active: true,
  });

  const notifications = await createNotificationRecords({
    hospitalId,
    event,
    templateEntry,
    currentUser,
  });

  event.queued_notification_ids = notifications.map((item) => item._id);
  event.status = resolveEventStatus(event.dispatch_mode, templateEntry.queue_enabled, notifications.length);
  event.dispatch_completed_at = new Date();
  await event.save();

  return {
    event,
    notifications,
    skipped_reason: null,
  };
}

module.exports = {
  getScopeDayParts,
  buildQueueKey,
  normalizeJobScheduling,
  createEventAndNotifications,
};
