import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { formatClinicalSummary } from '../shared/formatters/clinical.formatters.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'
import { getPatientCategoryLabel } from '../shared/enums/patient.enums.js'

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

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function parseSecondaryDiagnoses(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function createEmptyConsultationForm({ patientId = null, doctorId = null, appointmentId = null } = {}) {
  return {
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_id: appointmentId,
    chief_complaint: '',
    history_of_present_illness: '',
    vitals: {
      blood_pressure: '',
      weight_kg: '',
      height_cm: '',
      pulse: '',
      temperature_c: '',
      spo2: '',
    },
    examination: {
      general_examination: '',
      abdominal_examination: '',
      pelvic_examination: '',
      notes: '',
    },
    diagnosis: {
      primary: '',
      secondary_text: '',
      notes: '',
    },
    provisional_diagnosis: '',
    advice: '',
    notes: '',
    follow_up_required: false,
    follow_up_date: '',
  }
}

function adaptConsultationPatientSummary(patient = null) {
  if (!patient) {
    return null
  }

  return {
    id: patient._id || patient.id || null,
    patientCode: patient.patient_code || '--',
    fullName: patient.full_name || 'Unknown Patient',
    phone: patient.phone || '--',
    category: patient.category || 'uncategorized',
    categoryLabel: getPatientCategoryLabel(patient.category || 'uncategorized'),
    isActive: patient.is_active ?? true,
  }
}

export function adaptConsultationDetail(consultation = {}) {
  const diagnosis = consultation.diagnosis || {}

  return {
    id: consultation._id || consultation.id || null,
    patientSummary: adaptConsultationPatientSummary(consultation.patient_id || null),
    doctorSummary: consultation.doctor_id
      ? {
          id: consultation.doctor_id._id || consultation.doctor_id.id || null,
          fullName: consultation.doctor_id.full_name || 'Doctor',
          speciality: consultation.doctor_id.speciality || '--',
        }
      : null,
    appointmentSummary: consultation.appointment_id
      ? {
          id: consultation.appointment_id._id || consultation.appointment_id.id || null,
          scheduledAtLabel: formatDateTime(consultation.appointment_id.scheduled_at),
          status: consultation.appointment_id.status || null,
          statusLabel: formatStatusLabel(consultation.appointment_id.status),
          visitType: consultation.appointment_id.visit_type || null,
          visitTypeLabel: formatStatusLabel(consultation.appointment_id.visit_type),
        }
      : null,
    status: consultation.status || 'draft',
    statusLabel: formatStatusLabel(consultation.status || 'draft'),
    startedAtLabel: formatDateTime(consultation.started_at),
    endedAtLabel: formatDateTime(consultation.ended_at),
    finalisedAtLabel: formatDateTime(consultation.finalised_at || consultation.finalized_at),
    followUpSummary: consultation.follow_up_summary
      ? adaptConsultationFollowUp(consultation.follow_up_summary)
      : null,
    form: {
      patient_id: consultation.patient_id?._id || consultation.patient_id || null,
      doctor_id: consultation.doctor_id?._id || consultation.doctor_id || null,
      appointment_id: consultation.appointment_id?._id || consultation.appointment_id || null,
      chief_complaint: consultation.chief_complaint || '',
      history_of_present_illness: consultation.history_of_present_illness || '',
      vitals: {
        blood_pressure: consultation.vitals?.blood_pressure || '',
        weight_kg: consultation.vitals?.weight_kg ?? '',
        height_cm: consultation.vitals?.height_cm ?? '',
        pulse: consultation.vitals?.pulse ?? '',
        temperature_c: consultation.vitals?.temperature_c ?? '',
        spo2: consultation.vitals?.spo2 ?? '',
      },
      examination: {
        general_examination: consultation.examination?.general_examination || '',
        abdominal_examination: consultation.examination?.abdominal_examination || '',
        pelvic_examination: consultation.examination?.pelvic_examination || '',
        notes: consultation.examination?.notes || '',
      },
      diagnosis: {
        primary: diagnosis.primary || '',
        secondary_text: Array.isArray(diagnosis.secondary) ? diagnosis.secondary.join(', ') : '',
        notes: diagnosis.notes || '',
      },
      provisional_diagnosis: consultation.provisional_diagnosis || '',
      advice: consultation.advice || '',
      notes: consultation.notes || '',
      follow_up_required: Boolean(consultation.follow_up_required),
      follow_up_date: consultation.follow_up_date ? String(consultation.follow_up_date).slice(0, 10) : '',
    },
    summary: formatClinicalSummary(consultation),
    raw: consultation,
  }
}

export function adaptConsultationWorkspace(workspace = {}) {
  const editable = workspace.editable_sections || {}

  return {
    consultation: {
      id: workspace.consultation?._id || null,
      status: workspace.current_status || workspace.consultation?.status || 'draft',
      statusLabel: formatStatusLabel(workspace.current_status || workspace.consultation?.status || 'draft'),
      startedAtLabel: formatDateTime(workspace.consultation?.started_at),
      endedAtLabel: formatDateTime(workspace.consultation?.ended_at),
      finalisedAtLabel: formatDateTime(workspace.consultation?.finalised_at),
    },
    patientSummary: adaptConsultationPatientSummary(workspace.patient_summary || null),
    doctorSummary: workspace.doctor_summary
      ? {
          id: workspace.doctor_summary._id || null,
          fullName: workspace.doctor_summary.full_name || 'Doctor',
          speciality: workspace.doctor_summary.speciality || '--',
        }
      : null,
    appointmentSummary: workspace.appointment_summary
      ? {
          id: workspace.appointment_summary._id || null,
          scheduledAtLabel: formatDateTime(workspace.appointment_summary.scheduled_at),
          status: workspace.appointment_summary.status || null,
          statusLabel: formatStatusLabel(workspace.appointment_summary.status),
          visitType: workspace.appointment_summary.visit_type || null,
          visitTypeLabel: formatStatusLabel(workspace.appointment_summary.visit_type),
        }
      : null,
    editableSections: {
      chief_complaint: editable.chief_complaint || '',
      history_of_present_illness: editable.history_of_present_illness || '',
      vitals: {
        blood_pressure: editable.vitals?.blood_pressure || '',
        weight_kg: editable.vitals?.weight_kg ?? '',
        height_cm: editable.vitals?.height_cm ?? '',
        pulse: editable.vitals?.pulse ?? '',
        temperature_c: editable.vitals?.temperature_c ?? '',
        spo2: editable.vitals?.spo2 ?? '',
      },
      examination: {
        general_examination: editable.examination?.general_examination || '',
        abdominal_examination: editable.examination?.abdominal_examination || '',
        pelvic_examination: editable.examination?.pelvic_examination || '',
        notes: editable.examination?.notes || '',
      },
      diagnosis: {
        primary: editable.diagnosis?.primary || '',
        secondary_text: Array.isArray(editable.diagnosis?.secondary)
          ? editable.diagnosis.secondary.join(', ')
          : '',
        notes: editable.diagnosis?.notes || '',
      },
      provisional_diagnosis: editable.provisional_diagnosis || '',
      advice: editable.advice || '',
      notes: editable.notes || '',
      follow_up_required: Boolean(editable.follow_up_required),
      follow_up_date: editable.follow_up_date ? String(editable.follow_up_date).slice(0, 10) : '',
    },
    followUpSummary: workspace.follow_up_summary
      ? adaptConsultationFollowUp(workspace.follow_up_summary)
      : null,
    raw: workspace,
  }
}

export function adaptConsultationFollowUp(followUp = null) {
  if (!followUp) {
    return null
  }

  return {
    id: followUp._id || followUp.id || null,
    dueDate: followUp.due_date || null,
    dueDateLabel: formatDate(followUp.due_date),
    status: followUp.status || 'pending',
    statusLabel: formatStatusLabel(followUp.status || 'pending'),
    priority: followUp.priority || 'normal',
    priorityLabel: formatStatusLabel(followUp.priority || 'normal'),
    notes: followUp.notes || null,
    reason: followUp.reason || null,
    raw: followUp,
  }
}

export function mapConsultationFormToPayload(values = {}, context = {}) {
  return {
    patient_id: context.patientId || values.patient_id || null,
    doctor_id: context.doctorId || values.doctor_id || null,
    appointment_id: context.appointmentId || values.appointment_id || null,
    chief_complaint: normalizeOptionalText(values.chief_complaint),
    history_of_present_illness: normalizeOptionalText(values.history_of_present_illness),
    vitals: {
      blood_pressure: normalizeOptionalText(values.vitals?.blood_pressure),
      weight_kg: normalizeNumber(values.vitals?.weight_kg),
      height_cm: normalizeNumber(values.vitals?.height_cm),
      pulse: normalizeNumber(values.vitals?.pulse),
      temperature_c: normalizeNumber(values.vitals?.temperature_c),
      spo2: normalizeNumber(values.vitals?.spo2),
    },
    examination: {
      general_examination: normalizeOptionalText(values.examination?.general_examination),
      abdominal_examination: normalizeOptionalText(values.examination?.abdominal_examination),
      pelvic_examination: normalizeOptionalText(values.examination?.pelvic_examination),
      notes: normalizeOptionalText(values.examination?.notes),
    },
    diagnosis: {
      primary: normalizeOptionalText(values.diagnosis?.primary),
      secondary: parseSecondaryDiagnoses(values.diagnosis?.secondary_text),
      notes: normalizeOptionalText(values.diagnosis?.notes),
    },
    provisional_diagnosis: normalizeOptionalText(values.provisional_diagnosis),
    advice: normalizeOptionalText(values.advice),
    notes: normalizeOptionalText(values.notes),
    follow_up_required: Boolean(values.follow_up_required),
    follow_up_date: values.follow_up_required
      ? (values.follow_up_date ? `${values.follow_up_date}T00:00:00.000Z` : null)
      : null,
  }
}

export function mapConsultationStatusPayload(status) {
  return { status }
}

export function mapConsultationFinalisePayload(values = {}) {
  return {
    follow_up_required: Boolean(values.follow_up_required),
    follow_up_date: values.follow_up_required
      ? (values.follow_up_date ? `${values.follow_up_date}T00:00:00.000Z` : null)
      : null,
    follow_up_reason: normalizeOptionalText(values.follow_up_reason),
    follow_up_notes: normalizeOptionalText(values.follow_up_notes),
    follow_up_priority: values.follow_up_priority || 'normal',
  }
}
