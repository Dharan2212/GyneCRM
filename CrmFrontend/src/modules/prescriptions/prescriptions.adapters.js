import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

function normalizeText(value) {
  return value == null ? '' : String(value)
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value).trim()
  return normalized || null
}

function normalizeNumber(value) {
  if (value === '' || value == null) {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function createEmptyPrescriptionItem() {
  return {
    medicine_name: '',
    generic_name: '',
    formulation: '',
    strength: '',
    dose: '',
    route: 'oral',
    frequency: 'Once daily',
    duration_value: '',
    duration_unit: 'days',
    quantity: '',
    instructions: '',
    before_food: false,
    after_food: true,
    morning: true,
    afternoon: false,
    evening: false,
    night: false,
    is_prn: false,
    prn_reason: '',
    notes: '',
    status: 'active',
  }
}

export function createEmptyPrescriptionForm(context = {}) {
  return {
    patient_id: context.patientId || null,
    doctor_id: context.doctorId || null,
    consultation_id: context.consultationId || null,
    appointment_id: context.appointmentId || null,
    prescription_date: context.prescriptionDate || new Date().toISOString().slice(0, 10),
    diagnosis_summary: context.diagnosisSummary || '',
    advice_notes: context.adviceNotes || '',
    general_instructions: context.generalInstructions || '',
    items: context.items?.length ? context.items : [createEmptyPrescriptionItem()],
  }
}

function buildDurationLabel(item = {}) {
  if (item.duration_value == null || item.duration_value === '') {
    return '--'
  }

  if (!item.duration_unit) {
    return String(item.duration_value)
  }

  return `${item.duration_value} ${item.duration_unit}`
}

function buildTimingLabel(item = {}) {
  const timing = []
  if (item.morning) timing.push('Morning')
  if (item.afternoon) timing.push('Afternoon')
  if (item.evening) timing.push('Evening')
  if (item.night) timing.push('Night')
  return timing.join(', ') || '--'
}

export function adaptPrescriptionItem(item = {}, index = 0) {
  return {
    key: `${item.item_no || index + 1}-${item.medicine_name || 'item'}`,
    itemNo: item.item_no || index + 1,
    medicineName: item.medicine_name || '--',
    genericName: item.generic_name || '',
    formulation: item.formulation || '',
    strength: item.strength || '',
    dose: item.dose || '--',
    route: item.route || '--',
    frequency: item.frequency || '--',
    durationValue: item.duration_value ?? '',
    durationUnit: item.duration_unit || '',
    durationLabel: buildDurationLabel(item),
    quantity: item.quantity ?? '',
    instructions: item.instructions || '',
    beforeFood: Boolean(item.before_food),
    afterFood: Boolean(item.after_food),
    timingLabel: buildTimingLabel(item),
    isPrn: Boolean(item.is_prn),
    prnReason: item.prn_reason || '',
    notes: item.notes || '',
    status: item.status || 'active',
    statusLabel: formatStatusLabel(item.status || 'active'),
    raw: item,
  }
}

export function adaptPrescriptionDetail(prescription = {}) {
  return {
    id: prescription._id || prescription.id || null,
    prescriptionDate: prescription.prescription_date || null,
    prescriptionDateLabel: formatDate(prescription.prescription_date),
    issueStatus: prescription.issue_status || 'draft',
    issueStatusLabel: formatStatusLabel(prescription.issue_status || 'draft'),
    sendStatus: prescription.send_status || 'not_sent',
    sendStatusLabel: formatStatusLabel(prescription.send_status || 'not_sent'),
    voidStatus: Boolean(prescription.void_status),
    voidReason: prescription.void_reason || '',
    issuedAtLabel: formatDateTime(prescription.issued_at),
    voidedAtLabel: formatDateTime(prescription.voided_at),
    sentAtLabel: formatDateTime(prescription.sent_at),
    sendChannels: prescription.send_channels || [],
    sendChannelsLabel: (prescription.send_channels || []).map((value) => formatStatusLabel(value)).join(', ') || '--',
    totalItems: prescription.total_items || (prescription.items || []).length || 0,
    activeItemsCount: prescription.active_items_count || 0,
    isIssued: Boolean(prescription.is_issued || prescription.issue_status === 'issued'),
    isVoided: Boolean(prescription.is_voided || prescription.void_status),
    isSent: Boolean(prescription.is_sent || prescription.send_status === 'sent'),
    isSendReady: Boolean(prescription.is_send_ready),
    patientSummary: prescription.patient_id ? {
      id: prescription.patient_id._id || prescription.patient_id.id || null,
      patientCode: prescription.patient_id.patient_code || '--',
      fullName: prescription.patient_id.full_name || 'Patient',
      phone: prescription.patient_id.phone || '--',
      category: prescription.patient_id.category || 'uncategorized',
      categoryLabel: formatStatusLabel(prescription.patient_id.category || 'uncategorized'),
    } : null,
    doctorSummary: prescription.doctor_id ? {
      id: prescription.doctor_id._id || prescription.doctor_id.id || null,
      fullName: prescription.doctor_id.full_name || 'Doctor',
      speciality: prescription.doctor_id.speciality || '--',
      registrationNumber: prescription.doctor_id.registration_number || '--',
    } : null,
    consultationSummary: prescription.consultation_id ? {
      id: prescription.consultation_id._id || prescription.consultation_id.id || null,
      status: prescription.consultation_id.status || null,
      statusLabel: formatStatusLabel(prescription.consultation_id.status || ''),
      chiefComplaint: prescription.consultation_id.chief_complaint || '',
      followUpRequired: Boolean(prescription.consultation_id.follow_up_required),
      followUpDateLabel: formatDate(prescription.consultation_id.follow_up_date),
    } : null,
    appointmentSummary: prescription.appointment_id ? {
      id: prescription.appointment_id._id || prescription.appointment_id.id || null,
      scheduledAtLabel: formatDateTime(prescription.appointment_id.scheduled_at),
      status: prescription.appointment_id.status || null,
      statusLabel: formatStatusLabel(prescription.appointment_id.status || ''),
      visitType: prescription.appointment_id.visit_type || null,
      visitTypeLabel: formatStatusLabel(prescription.appointment_id.visit_type || ''),
    } : null,
    diagnosisSummary: prescription.diagnosis_summary || '',
    adviceNotes: prescription.advice_notes || '',
    generalInstructions: prescription.general_instructions || '',
    items: (prescription.items || []).map(adaptPrescriptionItem),
    pdfAvailable: prescription.issue_status === 'issued' && !prescription.void_status,
    raw: prescription,
  }
}

export function adaptPrescriptionPdfFoundation(payload = {}) {
  return {
    foundationType: payload.foundation_type || '--',
    filename: payload.filename || '--',
    contentType: payload.content_type || '--',
    issuedOnlyRule: Boolean(payload.issued_only_rule),
    document: payload.document || null,
    raw: payload,
  }
}

export function mapPrescriptionFormToPayload(values = {}) {
  return {
    patient_id: values.patient_id || null,
    doctor_id: values.doctor_id || null,
    consultation_id: values.consultation_id || null,
    appointment_id: values.appointment_id || null,
    prescription_date: values.prescription_date ? `${values.prescription_date}T00:00:00.000Z` : null,
    diagnosis_summary: normalizeOptionalText(values.diagnosis_summary),
    advice_notes: normalizeOptionalText(values.advice_notes),
    general_instructions: normalizeOptionalText(values.general_instructions),
    items: (values.items || [])
      .map((item, index) => ({
        item_no: index + 1,
        medicine_name: normalizeOptionalText(item.medicine_name),
        generic_name: normalizeOptionalText(item.generic_name),
        formulation: normalizeOptionalText(item.formulation),
        strength: normalizeOptionalText(item.strength),
        dose: normalizeOptionalText(item.dose),
        route: normalizeOptionalText(item.route),
        frequency: normalizeOptionalText(item.frequency),
        duration_value: normalizeNumber(item.duration_value),
        duration_unit: item.duration_unit || null,
        quantity: normalizeNumber(item.quantity),
        instructions: normalizeOptionalText(item.instructions),
        before_food: Boolean(item.before_food),
        after_food: Boolean(item.after_food),
        morning: Boolean(item.morning),
        afternoon: Boolean(item.afternoon),
        evening: Boolean(item.evening),
        night: Boolean(item.night),
        is_prn: Boolean(item.is_prn),
        prn_reason: normalizeOptionalText(item.prn_reason),
        notes: normalizeOptionalText(item.notes),
        status: item.status || 'active',
      }))
      .filter((item) => item.medicine_name),
  }
}
