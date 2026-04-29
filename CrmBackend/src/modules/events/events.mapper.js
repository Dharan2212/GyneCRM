function buildRecipientSnapshot(sourceRecord = {}, currentUser = {}, recipientStrategy = 'patient_primary', explicitSnapshot = null) {
  if (explicitSnapshot) {
    return explicitSnapshot;
  }

  const patientId = sourceRecord.patient_id || null;
  const doctorId = sourceRecord.doctor_id || null;

  switch (recipientStrategy) {
    case 'doctor_only':
      return {
        recipient_type: 'doctor',
        doctor_id: doctorId,
      };
    case 'patient_primary':
    default:
      return {
        recipient_type: 'patient',
        patient_id: patientId,
      };
  }
}

function dedupeChannels(channels = []) {
  return Array.from(new Set((Array.isArray(channels) ? channels : []).filter(Boolean)));
}

module.exports = {
  buildRecipientSnapshot,
  dedupeChannels,
};
