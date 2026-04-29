import { formatDate, formatDateTime, formatTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

function getInitials(name = '') {
  const normalized = String(name || '').trim()
  if (!normalized) return 'PT'
  const parts = normalized.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
}

function getAvatarIndex(seed = '') {
  return Array.from(String(seed || '0')).reduce((total, char) => total + char.charCodeAt(0), 0) % 5
}

function mapAppointmentBadge(status) {
  switch (status) {
    case 'completed':
      return 'done'
    case 'checked_in':
    case 'in_consultation':
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

function mapPriorityBadge(priority) {
  if (priority === 'urgent' || priority === 'high' || priority === 'stat') {
    return 'high'
  }

  if (priority === 'reviewed' || priority === 'completed') {
    return 'done'
  }

  return 'wait'
}

function adaptPatientChip(item = {}) {
  const patientName = item.patient_name || 'Unknown Patient'
  const patientCode = item.patient_code || '--'
  const seed = item.patient_id || item.id || patientCode

  return {
    id: item.id || item.patient_id || null,
    patientId: item.patient_id || null,
    patientName,
    patientCode,
    initials: getInitials(patientName),
    avatarIndex: getAvatarIndex(seed),
  }
}

function buildRecentActivity(data = {}) {
  const timeline = []

  ;(data.summaries?.next_upcoming_appointments || []).slice(0, 3).forEach((item) => {
    timeline.push({
      key: `upcoming-${item.id}`,
      sortAt: item.scheduled_at || null,
      title: `${item.patient_name || 'Upcoming Patient'} - Upcoming appointment`,
      sub: `${formatDateTime(item.scheduled_at)}${item.label ? ` - ${item.label}` : ''}`,
      color: '#7B1F3A',
    })
  })

  ;(data.pending_work?.followups_due || []).slice(0, 3).forEach((item) => {
    timeline.push({
      key: `followup-${item.id}`,
      sortAt: item.due_date || null,
      title: `${item.patient_name || 'Follow-up Patient'} - Follow-up due`,
      sub: `${formatDate(item.due_date)} - ${formatStatusLabel(item.priority, 'Pending')}${item.label ? ` - ${item.label}` : ''}`,
      color: '#D4720A',
    })
  })

  ;(data.summaries?.recently_finalised_consultations || []).slice(0, 3).forEach((item) => {
    timeline.push({
      key: `finalised-${item.id}`,
      sortAt: item.finalised_at || null,
      title: `${item.patient_name || 'Patient'} - Consultation finalised`,
      sub: `${formatDateTime(item.finalised_at)}${item.label ? ` - ${item.label}` : ''}`,
      color: '#2A7A50',
    })
  })

  return timeline
    .sort((left, right) => new Date(right.sortAt || 0).getTime() - new Date(left.sortAt || 0).getTime())
    .slice(0, 5)
    .map(({ key, sortAt, ...item }) => item)
}

export function adaptDoctorDashboard(data = {}) {
  const context = data.context || {}
  const kpis = data.kpis || {}
  const pendingWork = data.pending_work || {}
  const summaries = data.summaries || {}

  const doctorName = context.doctor?.full_name || 'Doctor'
  const dateLabel = formatDate(context.selected_date || context.generated_at)

  return {
    context: {
      doctorId: context.doctor_id || context.doctor?.id || null,
      hospitalId: context.hospital_id || null,
      generatedAt: context.generated_at || null,
      doctorName,
    },
    header: {
      doctorName,
      subtitle: `${dateLabel} • ${kpis.appointments_today_total || 0} appointments scheduled`,
      generatedAtLabel: formatDateTime(context.generated_at),
    },
    alerts: {
      consultationsNeedingAttention: (pendingWork.consultations_needing_attention || []).length,
      pendingTestReviews: (pendingWork.test_results_pending_review || []).length,
      highRiskPregnancies: (pendingWork.high_risk_pregnancies_needing_attention || []).length,
      followupsDue: (pendingWork.followups_due || []).length,
    },
    cards: [
      { id: 'appointments-today', icon: 'All', num: kpis.appointments_today_total || 0, label: 'Appointments Today', ac: 'm' },
      { id: 'appointments-pending', icon: 'Wait', num: kpis.appointments_pending || 0, label: 'Pending Queue', ac: 't' },
      { id: 'consultations-progress', icon: 'Cons', num: kpis.consultations_in_progress || 0, label: 'In Progress', ac: 's' },
      { id: 'followups-due', icon: 'Fup', num: kpis.followups_due_today || 0, label: 'Follow-ups Due', ac: 'g' },
      { id: 'high-risk', icon: 'Risk', num: kpis.active_high_risk_pregnancies || 0, label: 'High Risk', ac: 'wn' },
    ],
    todayAppointments: (pendingWork.today_appointments || []).map((item) => ({
      ...adaptPatientChip(item),
      id: item.id,
      scheduledAt: item.scheduled_at,
      timeLabel: formatTime(item.scheduled_at),
      status: item.status,
      statusLabel: formatStatusLabel(item.status),
      badgeType: mapAppointmentBadge(item.status),
      appointmentType: item.appointment_type || 'Consultation',
      label: item.label || item.appointment_type || null,
    })),
    consultationsNeedingAttention: (pendingWork.consultations_needing_attention || []).map((item) => ({
      ...adaptPatientChip(item),
      id: item.id,
      status: item.status,
      statusLabel: formatStatusLabel(item.status),
      badgeType: mapAppointmentBadge(item.status),
      updatedAtLabel: formatDateTime(item.updated_at),
      label: item.label || 'Consultation requires follow-up',
    })),
    highRiskPatients: (pendingWork.high_risk_pregnancies_needing_attention || []).map((item) => ({
      ...adaptPatientChip(item),
      id: item.id,
      status: item.status,
      badgeType: 'high',
      badgeLabel: item.gestational_age_weeks ? `Wk ${item.gestational_age_weeks}` : 'High Risk',
      eddLabel: formatDate(item.edd),
      trimester: item.trimester || null,
      label: item.label || 'Requires close monitoring',
    })),
    pendingTests: (pendingWork.test_results_pending_review || []).map((item) => ({
      ...adaptPatientChip(item),
      id: item.id,
      status: item.status,
      statusLabel: formatStatusLabel(item.status),
      badgeType: mapPriorityBadge(item.priority),
      orderedAtLabel: formatDate(item.ordered_at),
      label: item.label || 'Uploaded result awaiting review',
    })),
    recentActivity: buildRecentActivity({ pending_work: pendingWork, summaries }),
    snapshot: [
      { label: 'Checked In', value: kpis.appointments_checked_in || 0 },
      { label: 'Finalised Today', value: kpis.consultations_finalised_today || 0 },
      { label: 'Prescriptions Issued', value: kpis.prescriptions_issued_today || 0 },
      { label: 'Urgent Items', value: summaries.urgent_items_count || 0 },
    ],
    placeholders: {
      pregnancyProgress: true,
      ivfPipeline: true,
    },
    notes: data.warnings_or_notes || [],
  }
}
