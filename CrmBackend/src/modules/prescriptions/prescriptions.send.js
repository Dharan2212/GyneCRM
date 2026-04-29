const { normalizeNullableString } = require('./prescriptions.query');

function mergeUniqueChannels(existingChannels = [], incomingChannels = []) {
  const merged = new Set([...(existingChannels || []), ...(incomingChannels || [])]);
  return Array.from(merged);
}

function applySendState(prescription, payload = {}, actorId) {
  const channels = mergeUniqueChannels(prescription.send_channels, payload.send_channels || []);

  prescription.send_status = 'sent';
  prescription.send_channels = channels;
  prescription.sent_at = new Date();
  prescription.sent_by = actorId;

  if (Object.prototype.hasOwnProperty.call(payload, 'send_notes')) {
    prescription.send_notes = normalizeNullableString(payload.send_notes);
  }

  return prescription;
}

module.exports = {
  mergeUniqueChannels,
  applySendState,
};
