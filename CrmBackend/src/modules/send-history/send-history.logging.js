const Patient = require('../../models/Patient');
const SendHistory = require('../../models/SendHistory');

function dedupeChannels(channels = []) {
  return Array.from(new Set((Array.isArray(channels) ? channels : []).filter(Boolean)));
}

function pickRecipient(patient, channel) {
  if (!patient) {
    return null;
  }

  if (channel === 'whatsapp') {
    return patient.family_whatsapp || patient.phone || null;
  }

  if (channel === 'sms') {
    return patient.phone || patient.family_whatsapp || null;
  }

  return null;
}

function buildStatusTimestamps(status, timestamp) {
  const base = {
    requested_at: timestamp,
    queued_at: null,
    sent_at: null,
    delivered_at: null,
    failed_at: null,
  };

  if (status === 'queued') {
    base.queued_at = timestamp;
  }

  if (status === 'sent') {
    base.sent_at = timestamp;
  }

  if (status === 'delivered') {
    base.sent_at = timestamp;
    base.delivered_at = timestamp;
  }

  if (status === 'failed') {
    base.failed_at = timestamp;
  }

  return base;
}

async function createSendHistoryEntries(options = {}) {
  const channels = dedupeChannels(options.channels);

  if (channels.length === 0) {
    return [];
  }

  const timestamp = options.timestamp || new Date();
  const status = options.status || 'sent';
  const patient = options.patient_id
    ? await Patient.findById(options.patient_id).select('_id phone family_whatsapp').lean()
    : null;

  const docs = channels.map((channel) => ({
    hospital_id: options.hospital_id,
    patient_id: options.patient_id,
    doctor_id: options.doctor_id || null,
    source_type: options.source_type,
    source_id: options.source_id,
    source_number: options.source_number || null,
    channel,
    recipient: options.recipient || pickRecipient(patient, channel),
    recipient_type: options.recipient_type || 'patient',
    subject: options.subject || null,
    message_summary: options.message_summary || null,
    template_key: options.template_key || null,
    payload_snapshot: options.payload_snapshot || null,
    status,
    provider: options.provider || 'internal',
    provider_message_id: options.provider_message_id || null,
    attempt_number: options.attempt_number || 1,
    ...buildStatusTimestamps(status, timestamp),
    error_code: options.error_code || null,
    error_message: options.error_message || null,
    initiated_by: options.initiated_by || null,
    metadata: options.metadata || null,
    is_active: true,
  }));

  return SendHistory.insertMany(docs, { ordered: false });
}

module.exports = {
  createSendHistoryEntries,
};
