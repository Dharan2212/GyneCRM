import {
  BACKEND_PATIENT_CATEGORY_TO_TEMPLATE,
  getPatientCategoryLabel,
  TEMPLATE_PATIENT_CATEGORY_TO_BACKEND,
} from '../shared/enums/patient.enums.js'
import { formatPatientSummary } from '../shared/formatters/patient.formatters.js'
import { formatDate, formatDateTime, formatStatusLabel } from '../shared/formatters/index.js'

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

function formatAddress(address = {}) {
  return [
    address.line_1,
    address.line_2,
    address.area,
    address.city,
    address.state,
    address.postal_code,
  ].filter(Boolean).join(', ')
}

function formatEmergencyContact(contact = {}) {
  if (!contact || typeof contact !== 'object') return '--'
  const label = [contact.name, contact.relation].filter(Boolean).join(' • ')
  return [label, contact.phone].filter(Boolean).join(' • ') || '--'
}

function formatMedicalHistory(history = {}) {
  if (!history || typeof history !== 'object') {
    return []
  }

  const entries = []
  if (Array.isArray(history.existing_conditions) && history.existing_conditions.length > 0) {
    entries.push(`Conditions: ${history.existing_conditions.join(', ')}`)
  }
  if (Array.isArray(history.allergies) && history.allergies.length > 0) {
    entries.push(`Allergies: ${history.allergies.join(', ')}`)
  }
  if (Array.isArray(history.current_medications) && history.current_medications.length > 0) {
    entries.push(`Medications: ${history.current_medications.join(', ')}`)
  }
  if (history.family_history) {
    entries.push(`Family history: ${history.family_history}`)
  }
  if (history.notes) {
    entries.push(`Notes: ${history.notes}`)
  }

  return entries
}

function splitCommaSeparated(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isValidPhone(value) {
  if (!value) return true
  const normalized = String(value).trim()
  if (!normalized) return true
  const digits = normalized.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

function isFutureDate(value) {
  if (!value) return false
  const selected = new Date(value)
  const now = new Date()
  selected.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return selected.getTime() > now.getTime()
}

export function adaptPatientListItem(patient = {}) {
  const summary = formatPatientSummary(patient)

  return {
    ...summary,
    rowId: summary.id,
    patientCode: summary.patientCode,
    name: summary.name,
    avatarInitials: getInitials(summary.name),
    avatarIndex: getAvatarIndex(summary.id || summary.patientCode),
    templateCategory: BACKEND_PATIENT_CATEGORY_TO_TEMPLATE[summary.category] || null,
    categoryBadgeLabel: summary.categoryLabel,
    contactLabel: summary.phone,
    activeLabel: summary.isActive ? 'Active' : 'Inactive',
    activeBadgeType: summary.isActive ? 'done' : 'pending',
    registeredAtLabel: formatDate(patient.createdAt || patient.registered_at),
    detailsLabel: [summary.bloodGroup !== '--' ? `Blood ${summary.bloodGroup}` : null, patient?.family_whatsapp ? `WA ${patient.family_whatsapp}` : null]
      .filter(Boolean)
      .join(' • ') || 'Profile available',
    raw: patient,
  }
}

export function adaptPatientDetail(patient = {}) {
  const summary = formatPatientSummary(patient)

  return {
    summary: {
      ...summary,
      avatarInitials: getInitials(summary.name),
      avatarIndex: getAvatarIndex(summary.id || summary.patientCode),
      registeredAtLabel: formatDateTime(patient.createdAt),
      updatedAtLabel: formatDateTime(patient.updatedAt),
      activeLabel: summary.isActive ? 'Active' : 'Inactive',
      activeBadgeType: summary.isActive ? 'done' : 'pending',
    },
    addressLabel: formatAddress(patient.address),
    emergencyContactLabel: formatEmergencyContact(patient.emergency_contact),
    familyWhatsapp: patient.family_whatsapp || '--',
    medicalHistoryNotes: formatMedicalHistory(patient.medical_history),
    consents: patient.consents || [],
    raw: patient,
  }
}

export function adaptPatientHub(hub = {}) {
  const patient = hub.patient || {}
  const recentAppointments = hub.recent_appointments?.items || []
  const historySummary = hub.category?.history_summary || {}

  return {
    currentCategory: hub.category?.current || patient.category || 'uncategorized',
    currentCategoryLabel: getPatientCategoryLabel(hub.category?.current || patient.category || 'uncategorized'),
    categoryHistorySummary: {
      totalChanges: historySummary.total_changes || 0,
      latestChange: historySummary.latest_change
        ? {
            previousCategoryLabel: getPatientCategoryLabel(historySummary.latest_change.previous_category || 'uncategorized'),
            nextCategoryLabel: getPatientCategoryLabel(historySummary.latest_change.new_category || 'uncategorized'),
            changedAtLabel: formatDateTime(historySummary.latest_change.changed_at),
            reason: historySummary.latest_change.reason || null,
          }
        : null,
    },
    recentAppointments: recentAppointments.map((appointment) => ({
      id: appointment._id,
      scheduledAtLabel: formatDateTime(appointment.scheduled_at),
      statusLabel: formatStatusLabel(appointment.status),
      visitTypeLabel: formatStatusLabel(appointment.visit_type),
      reason: appointment.reason_for_visit || '--',
    })),
    summary: hub.summary || {},
    raw: hub,
  }
}

export function adaptPatientCategoryHistory(history = []) {
  return history.map((entry) => ({
    id: entry._id,
    previousCategoryLabel: getPatientCategoryLabel(entry.previous_category || 'uncategorized'),
    nextCategoryLabel: getPatientCategoryLabel(entry.new_category || 'uncategorized'),
    changedAtLabel: formatDateTime(entry.changed_at || entry.createdAt),
    reason: entry.reason || null,
    raw: entry,
  }))
}

export function adaptPatientCategoryCounts(payload = {}) {
  const counts = payload.counts || payload || {}

  return {
    total: payload.total ?? Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    pregnancy: counts.pregnancy || 0,
    ivf: counts.ivf || 0,
    gynac: counts.gynac || 0,
    uncategorized: counts.uncategorized || 0,
  }
}

export function createPatientRegistrationForm() {
  return {
    full_name: '',
    phone: '',
    alternate_phone: '',
    date_of_birth: '',
    blood_group: 'Unknown',
    family_whatsapp: '',
    address_line_1: '',
    area: '',
    city: '',
    state: '',
    postal_code: '',
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    existing_conditions: '',
    allergies: '',
    medical_notes: '',
    is_active: true,
  }
}

export function validatePatientRegistrationForm(values = {}) {
  const errors = {}

  if (!String(values.full_name || '').trim()) {
    errors.full_name = 'Full name is required.'
  } else if (String(values.full_name || '').trim().length < 2) {
    errors.full_name = 'Full name must be at least 2 characters.'
  }

  if (!String(values.phone || '').trim()) {
    errors.phone = 'Phone is required.'
  } else if (!isValidPhone(values.phone)) {
    errors.phone = 'Phone number must contain between 7 and 15 digits.'
  }

  if (values.alternate_phone && !isValidPhone(values.alternate_phone)) {
    errors.alternate_phone = 'Alternate phone number must contain between 7 and 15 digits.'
  }

  if (values.family_whatsapp && !isValidPhone(values.family_whatsapp)) {
    errors.family_whatsapp = 'WhatsApp number must contain between 7 and 15 digits.'
  }

  if (values.emergency_phone && !isValidPhone(values.emergency_phone)) {
    errors.emergency_phone = 'Emergency contact number must contain between 7 and 15 digits.'
  }

  if (values.date_of_birth && isFutureDate(values.date_of_birth)) {
    errors.date_of_birth = 'Date of birth cannot be in the future.'
  }

  return errors
}

export function mapRegisterPatientFormToPayload(values = {}) {
  const bloodGroup = values.blood_group || values.blood || null

  return {
    full_name: values.full_name || values.name || '',
    date_of_birth: values.date_of_birth || null,
    phone: values.phone || '',
    alternate_phone: values.alternate_phone || '',
    address: values.address || {
      line_1: values.address_line_1 || '',
      area: values.area || '',
      city: values.city || '',
      state: values.state || '',
      postal_code: values.postal_code || '',
    },
    blood_group: bloodGroup === 'Unknown' ? null : bloodGroup,
    emergency_contact: values.emergency_contact || {
      name: values.emergency_name || '',
      relation: values.emergency_relation || '',
      phone: values.emergency_phone || '',
    },
    family_whatsapp: values.family_whatsapp || '',
    medical_history: values.medical_history || {
      existing_conditions: splitCommaSeparated(values.existing_conditions),
      allergies: splitCommaSeparated(values.allergies),
      notes: values.medical_notes || '',
    },
    consents: values.consents || [],
    is_active: values.is_active ?? true,
  }
}

export function adaptRegisteredPatient(patient = {}) {
  const summary = formatPatientSummary(patient)

  return {
    id: summary.id,
    patientCode: summary.patientCode,
    name: summary.name,
    phone: summary.phone,
    ageLabel: summary.ageLabel,
    categoryLabel: summary.categoryLabel,
  }
}

export function mapTemplateCategoryToBackend(category) {
  return TEMPLATE_PATIENT_CATEGORY_TO_BACKEND[category] || null
}

export function mapPatientFilterToQuery({ search, category, page, limit } = {}) {
  return {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(page ? { page } : {}),
    ...(limit ? { limit } : {}),
  }
}
