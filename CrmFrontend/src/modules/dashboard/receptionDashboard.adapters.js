import { formatDate, formatDateTime, formatTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

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

function mapAppointmentBadge(status) {
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

function mapVisitLabel(visitType) {
  switch (visitType) {
    case 'new':
      return 'First Visit'
    case 'follow_up':
      return 'Follow-up'
    case 'review':
      return 'Review'
    case 'procedure':
      return 'Procedure'
    case 'other':
      return 'Other'
    default:
      return formatStatusLabel(visitType || 'visit')
  }
}

export function adaptReceptionDashboard(data = {}) {
  const dateContext = data.date_context || {}
  const appointmentSummary = data.appointment_summary || {}
  const todayAppointments = data.today_appointments?.items || []
  const doctorWiseSummary = data.doctor_wise_summary || []
  const waitlistSummary = data.waitlist_summary || {}

  const totalAppointments = data.today_appointments?.total ?? todayAppointments.length
  const waitlistTotal = Object.values(waitlistSummary).reduce((sum, value) => sum + (Number(value) || 0), 0)

  return {
    header: {
      dateLabel: formatDate(dateContext.requested_date || dateContext.day_start),
      subtitle: `${formatDate(dateContext.requested_date || dateContext.day_start)} • ${totalAppointments} appointments on the desk`,
    },
    doctorCoverage: {
      totalDoctors: doctorWiseSummary.length,
      primaryDoctorLabel: doctorWiseSummary.length
        ? `${doctorWiseSummary.length} doctor${doctorWiseSummary.length > 1 ? 's' : ''} scheduled today`
        : 'Doctor schedule available',
      subtitle: doctorWiseSummary.length
        ? doctorWiseSummary.slice(0, 3).map((doctor) => `${doctor.full_name}${doctor.speciality ? ` • ${doctor.speciality}` : ''} (${doctor.count})`).join(' • ')
        : 'Doctor-wise appointment allocation will appear here.',
      items: doctorWiseSummary.map((doctor) => ({
        doctorId: doctor.doctor_id || null,
        fullName: doctor.full_name || 'Doctor',
        speciality: doctor.speciality || '--',
        count: doctor.count || 0,
      })),
    },
    cards: [
      { id: 'total', icon: 'All', num: totalAppointments, label: 'Total Appointments', ac: 'm' },
      { id: 'scheduled', icon: 'Wait', num: appointmentSummary.scheduled || 0, label: 'Scheduled', ac: 't' },
      { id: 'checked-in', icon: 'In', num: appointmentSummary.checked_in || 0, label: 'Checked In', ac: appointmentSummary.checked_in ? 'ok' : 't' },
      { id: 'completed', icon: 'Done', num: appointmentSummary.completed || 0, label: 'Completed', ac: 'g' },
      { id: 'waitlist', icon: 'WL', num: waitlistTotal, label: 'Waitlist', ac: waitlistTotal ? 'wn' : 'ok' },
    ],
    actionCards: [
      { id: 'register', label: 'Register Patient', sub: 'Live registration flow', page: 'rx-register', color: 't' },
      { id: 'appointments', label: 'Appointment Desk', sub: 'Live booking, check-in, reschedule', page: 'rx-appointments', color: 'm' },
      { id: 'upload', label: 'Upload Report', sub: 'Foundation upload flow is live', page: 'rx-upload', color: 'p' },
      { id: 'billing', label: 'Billing Desk', sub: 'Live invoice create and payment desk', page: 'rx-billing', color: 's' },
      { id: 'reminders', label: 'Reminders', sub: 'Deferred placeholder', page: 'rx-messages', color: 'g', deferred: true },
    ],
    appointmentSummary: {
      scheduled: appointmentSummary.scheduled || 0,
      checkedIn: appointmentSummary.checked_in || 0,
      completed: appointmentSummary.completed || 0,
      cancelled: appointmentSummary.cancelled || 0,
      noShow: appointmentSummary.no_show || 0,
    },
    todayAppointments: todayAppointments.map((appointment) => {
      const patient = appointment.patient_id || {}
      const doctor = appointment.doctor_id || {}
      const appointmentType = appointment.appointment_type_id || {}
      const seed = patient._id || appointment._id || appointment.id || patient.patient_code || patient.full_name || '0'

      return {
        id: appointment._id || appointment.id || null,
        patientId: patient._id || appointment.patient_id || null,
        patientName: patient.full_name || 'Patient',
        patientCode: patient.patient_code || '--',
        phone: patient.phone || '--',
        doctorName: doctor.full_name || 'Doctor',
        doctorSpeciality: doctor.speciality || '',
        appointmentTypeLabel: appointmentType.name || 'Consultation',
        scheduledAtLabel: formatDateTime(appointment.scheduled_at),
        timeLabel: formatTime(appointment.scheduled_at),
        status: appointment.status || 'scheduled',
        statusLabel: formatStatusLabel(appointment.status || 'scheduled'),
        statusBadgeType: mapAppointmentBadge(appointment.status),
        visitType: appointment.visit_type || 'new',
        visitTypeLabel: mapVisitLabel(appointment.visit_type),
        isFirstVisit: (appointment.visit_type || 'new') === 'new',
        initials: getInitials(patient.full_name),
        avatarIndex: getAvatarIndex(seed),
      }
    }),
    waitlistSummary: {
      waiting: waitlistSummary.waiting || 0,
      contacted: waitlistSummary.contacted || 0,
      converted: waitlistSummary.converted || 0,
      total: waitlistTotal,
    },
    placeholders: {
      uploadFlow: true,
      billingFlow: true,
      reminders: true,
    },
  }
}
