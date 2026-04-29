import { formatDate, formatDateTime, formatTime, formatStatusLabel } from '../shared/formatters/index.js'

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

export const VISIT_TYPE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'review', label: 'Review' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
]

function getInitials(name = '') {
  const normalized = String(name || '').trim()
  if (!normalized) return 'PT'
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getAvatarIndex(seed = '') {
  return Array.from(String(seed || '0')).reduce((total, char) => total + char.charCodeAt(0), 0) % 5
}

export function mapAppointmentStatusBadge(status) {
  switch (status) {
    case 'completed':
      return 'done'
    case 'checked_in':
      return 'normal'
    case 'cancelled':
    case 'no_show':
      return 'high'
    case 'rescheduled':
      return 'pending'
    case 'scheduled':
    default:
      return 'wait'
  }
}

export function getVisitTypeLabel(visitType) {
  return VISIT_TYPE_OPTIONS.find((option) => option.value === visitType)?.label || formatStatusLabel(visitType || 'visit')
}

export function adaptAppointmentTypeItem(item = {}) {
  return {
    id: item._id || item.id || null,
    name: item.name || 'Appointment',
    code: item.code || '--',
    description: item.description || '',
    isActive: item.is_active ?? true,
    label: item.code ? `${item.name} (${item.code})` : item.name,
    raw: item,
  }
}

export function createAppointmentForm(initial = {}) {
  return {
    patient_id: initial.patient_id || initial.patientId || '',
    doctor_id: initial.doctor_id || '',
    appointment_type_id: initial.appointment_type_id || '',
    scheduled_at: initial.scheduled_at || '',
    duration_minutes: initial.duration_minutes || 20,
    visit_type: initial.visit_type || 'new',
    reason_for_visit: initial.reason_for_visit || '',
    notes: initial.notes || '',
  }
}

export function validateAppointmentForm(values = {}) {
  const errors = {}

  if (!values.patient_id) errors.patient_id = 'Select a patient.'
  if (!values.doctor_id) errors.doctor_id = 'Select a doctor.'
  if (!values.appointment_type_id) errors.appointment_type_id = 'Select an appointment type.'
  if (!values.scheduled_at) errors.scheduled_at = 'Appointment date and time are required.'
  if (!values.duration_minutes || Number(values.duration_minutes) < 1) {
    errors.duration_minutes = 'Duration must be at least 1 minute.'
  }
  if (!values.visit_type) errors.visit_type = 'Visit type is required.'

  return errors
}

export function mapAppointmentFormToPayload(values = {}) {
  return {
    patient_id: values.patient_id,
    doctor_id: values.doctor_id,
    appointment_type_id: values.appointment_type_id,
    scheduled_at: new Date(values.scheduled_at).toISOString(),
    duration_minutes: Number(values.duration_minutes || 20),
    visit_type: values.visit_type,
    reason_for_visit: values.reason_for_visit || '',
    notes: values.notes || '',
  }
}

export function createRescheduleForm(appointment = {}) {
  const scheduledAt = appointment.raw?.scheduled_at || appointment.scheduledAtRaw || null
  const dateValue = scheduledAt ? new Date(scheduledAt) : null
  return {
    scheduled_at: dateValue ? new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
    duration_minutes: appointment.durationMinutes || 20,
    reschedule_reason: '',
    notes: appointment.notes || '',
  }
}

export function validateRescheduleForm(values = {}) {
  const errors = {}
  if (!values.scheduled_at) errors.scheduled_at = 'Select the new schedule.'
  if (!values.duration_minutes || Number(values.duration_minutes) < 1) errors.duration_minutes = 'Duration must be at least 1 minute.'
  return errors
}

export function mapRescheduleFormToPayload(values = {}) {
  return {
    scheduled_at: new Date(values.scheduled_at).toISOString(),
    duration_minutes: Number(values.duration_minutes || 20),
    reschedule_reason: values.reschedule_reason || '',
    notes: values.notes || '',
  }
}

export function adaptAppointmentListItem(appointment = {}) {
  const patient = appointment.patient_id || {}
  const doctor = appointment.doctor_id || {}
  const appointmentType = appointment.appointment_type_id || {}
  const id = appointment._id || appointment.id || null
  const patientName = patient.full_name || 'Patient'
  const scheduledAt = appointment.scheduled_at || null
  return {
    id,
    rowId: id,
    patientId: patient._id || appointment.patient_id || null,
    patientName,
    patientCode: patient.patient_code || '--',
    phone: patient.phone || '--',
    doctorId: doctor._id || appointment.doctor_id || null,
    doctorName: doctor.full_name || 'Doctor',
    doctorSpeciality: doctor.speciality || '--',
    appointmentTypeId: appointmentType._id || appointment.appointment_type_id || null,
    appointmentTypeLabel: appointmentType.name || 'Consultation',
    visitType: appointment.visit_type || 'new',
    visitTypeLabel: getVisitTypeLabel(appointment.visit_type || 'new'),
    status: appointment.status || 'scheduled',
    statusLabel: formatStatusLabel(appointment.status || 'scheduled'),
    statusBadgeType: mapAppointmentStatusBadge(appointment.status || 'scheduled'),
    scheduledAtRaw: scheduledAt,
    scheduledAtLabel: formatDateTime(scheduledAt),
    timeLabel: formatTime(scheduledAt),
    dateLabel: formatDate(scheduledAt),
    durationMinutes: appointment.duration_minutes || 0,
    reasonForVisit: appointment.reason_for_visit || '--',
    notes: appointment.notes || '',
    initials: getInitials(patientName),
    avatarIndex: getAvatarIndex(id || patient.patient_code || patientName),
    canCheckIn: (appointment.status || 'scheduled') === 'scheduled',
    canUpdateStatus: (appointment.status || 'scheduled') === 'scheduled',
    canReschedule: (appointment.status || 'scheduled') === 'scheduled',
    raw: appointment,
  }
}

export function adaptAppointmentDetail(appointment = {}) {
  const item = adaptAppointmentListItem(appointment)
  return {
    ...item,
    createdAtLabel: formatDateTime(appointment.createdAt),
    checkedInAtLabel: formatDateTime(appointment.checked_in_at),
    cancelledAtLabel: formatDateTime(appointment.cancelled_at),
    completedAtLabel: formatDateTime(appointment.completed_at),
    noShowAtLabel: formatDateTime(appointment.no_show_marked_at),
    cancellationReason: appointment.cancellation_reason || '--',
    rescheduledFromId: appointment.rescheduled_from || null,
  }
}

export function mapAppointmentListFilters(filters = {}) {
  return {
    date: filters.date || undefined,
    status: filters.status || undefined,
    page: filters.page || 1,
    limit: filters.limit || 50,
  }
}
