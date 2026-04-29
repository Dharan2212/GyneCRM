const { resolveHospitalId } = require('../appointments/appointments.query');

const DETAIL_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'doctor_id', select: 'full_name speciality registration_number' },
  { path: 'consultation_id', select: 'status chief_complaint follow_up_required follow_up_date appointment_id' },
  { path: 'appointment_id', select: 'scheduled_at status visit_type appointment_type_id is_active' },
];

function normalizeNullableString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeItem(item = {}) {
  const output = { ...item };

  [
    'medicine_name',
    'generic_name',
    'formulation',
    'strength',
    'dose',
    'route',
    'frequency',
    'instructions',
    'prn_reason',
    'notes',
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(output, field)) {
      output[field] = normalizeNullableString(output[field]);
    }
  });

  return output;
}

function normalizePrescriptionPayload(payload = {}) {
  const output = { ...payload };

  ['diagnosis_summary', 'advice_notes', 'general_instructions'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(output, field)) {
      output[field] = normalizeNullableString(output[field]);
    }
  });

  if (Array.isArray(output.items)) {
    output.items = output.items.map((item) => normalizeItem(item));
  }

  return output;
}

function buildPrescriptionResponse(prescription) {
  if (!prescription) {
    return prescription;
  }

  const items = Array.isArray(prescription.items) ? prescription.items : [];
  const activeItemsCount = items.filter((item) => item && item.status === 'active').length;

  return {
    ...prescription,
    total_items: items.length,
    active_items_count: activeItemsCount,
    is_issued: prescription.issue_status === 'issued',
    is_voided: Boolean(prescription.void_status),
    is_sent: prescription.send_status === 'sent',
    is_send_ready:
      prescription.issue_status === 'issued' && !prescription.void_status && items.length > 0,
  };
}

module.exports = {
  DETAIL_POPULATE,
  normalizeNullableString,
  normalizePrescriptionPayload,
  buildPrescriptionResponse,
  resolveHospitalId,
};
