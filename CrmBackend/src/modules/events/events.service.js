const Event = require('../../models/Event');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const {
  resolveHospitalId,
  normalizePagination,
  buildEventFilter,
  buildEventResponse,
  getScopedEventById,
} = require('./events.query');
const { EVENT_TYPE_DEFINITIONS } = require('./events.types');
const { EVENT_TEMPLATE_MAP } = require('./events.template-map');
const {
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
} = require('./events.dispatcher');

async function dispatchEvent(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id || null;
  validateEventTemplateCompatibility(payload.event_type, payload.source_type);

  const { record: sourceRecord, sourceNumber } = await resolveSourceRecord(payload.source_type, payload.source_id, hospitalId);
  const templateEntry = getTemplateMapEntry(payload.event_type);

  if (!templateEntry) {
    throw new AppError('Template mapping not found for event_type.', HTTP_STATUS.BAD_REQUEST);
  }

  const resolvedPatientId = payload.patient_id || sourceRecord.patient_id || null;
  const resolvedDoctorId = payload.doctor_id || sourceRecord.doctor_id || null;

  if (payload.patient_id && sourceRecord.patient_id && String(payload.patient_id) !== String(sourceRecord.patient_id)) {
    throw new AppError('patient_id must match the linked source record.', HTTP_STATUS.CONFLICT);
  }

  if (payload.doctor_id && sourceRecord.doctor_id && String(payload.doctor_id) !== String(sourceRecord.doctor_id)) {
    throw new AppError('doctor_id must match the linked source record.', HTTP_STATUS.CONFLICT);
  }

  await ensureScopedPatient(resolvedPatientId, hospitalId);
  await ensureScopedDoctor(resolvedDoctorId, hospitalId);

  const dispatchMode = resolveDispatchMode(payload);
  const channels = resolveChannels(payload, templateEntry);
  const recipientSnapshot = buildRecipientSnapshot(sourceRecord, currentUser, templateEntry.recipient_strategy, payload.recipient_snapshot || null);

  const event = await Event.create({
    hospital_id: hospitalId,
    patient_id: resolvedPatientId,
    doctor_id: resolvedDoctorId,
    source_type: payload.source_type,
    source_id: payload.source_id,
    source_number: payload.source_number || sourceNumber,
    event_type: payload.event_type,
    template_key: normalizeOptionalString(payload.template_key) || templateEntry.template_key,
    template_version: payload.template_version || 1,
    channels,
    recipient_snapshot: recipientSnapshot,
    payload_snapshot: payload.payload_snapshot ?? null,
    status: 'received',
    dispatch_mode: dispatchMode,
    dispatch_requested_at: new Date(),
    dispatch_started_at: new Date(),
    initiated_by: actorId,
    metadata: payload.metadata ?? null,
    is_active: true,
  });

  let queuedNotifications = [];
  let nextStatus = 'mapped';

  try {
    queuedNotifications = await createNotificationRecords({
      hospitalId,
      event,
      templateEntry,
      currentUser,
    });
    nextStatus = resolveEventStatus(dispatchMode, templateEntry.queue_enabled, queuedNotifications.length);

    event.status = nextStatus;
    event.queued_notification_ids = queuedNotifications.map((item) => item._id);
    event.dispatch_completed_at = new Date();
    await event.save();
  } catch (error) {
    event.status = 'failed';
    event.dispatch_failed_at = new Date();
    event.error_code = error.code || 'event_dispatch_failed';
    event.error_message = error.message || 'Event dispatch failed.';
    await event.save();
    throw error;
  }

  const detail = await getScopedEventById(String(event._id), hospitalId);
  return buildEventResponse(detail.toObject ? detail.toObject() : detail);
}

async function listEvents(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildEventFilter(query, hospitalId);

  const [rows, total] = await Promise.all([
    Event.find(filter)
      .populate(require('./events.query').LIST_POPULATE)
      .sort({ dispatch_requested_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return {
    records: rows.map(buildEventResponse),
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getEventDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const record = await getScopedEventById(id, hospitalId);
  return buildEventResponse(record.toObject ? record.toObject() : record);
}

function listEventTypes() {
  return Object.values(EVENT_TYPE_DEFINITIONS);
}

function listTemplateMap() {
  return Object.values(EVENT_TEMPLATE_MAP);
}

module.exports = {
  dispatchEvent,
  listEvents,
  getEventDetail,
  listEventTypes,
  listTemplateMap,
};
