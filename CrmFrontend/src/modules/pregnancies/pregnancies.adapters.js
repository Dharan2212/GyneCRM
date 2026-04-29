import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { PREGNANCY_MILESTONE_STATUS_LABELS, PREGNANCY_STATUS_LABELS } from '../shared/enums/pregnancy.enums.js'

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toTrimmedOrNull(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

export function formatGestationalAgeLabel(weeks, days) {
  if (typeof weeks !== 'number' && typeof days !== 'number') {
    return '--'
  }

  const safeWeeks = Number.isFinite(Number(weeks)) ? Number(weeks) : 0
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0
  return `${safeWeeks}w ${safeDays}d`
}

export function serializeHighRiskFlags(flags = []) {
  return (flags || [])
    .map((flag) => {
      const label = toTrimmedOrNull(flag?.label || flag?.code || '')
      const notes = toTrimmedOrNull(flag?.notes || '')
      if (!label && !notes) return null
      return notes ? `${label || 'Flag'} | ${notes}` : label
    })
    .filter(Boolean)
    .join('\n')
}

export function parseHighRiskFlagsInput(value = '') {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelPart, ...rest] = line.split('|')
      const label = toTrimmedOrNull(labelPart)
      const notes = toTrimmedOrNull(rest.join('|'))
      const code = label
        ? label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `flag_${index + 1}`
        : `flag_${index + 1}`

      return {
        code,
        label: label || `Risk Flag ${index + 1}`,
        ...(notes ? { notes } : {}),
      }
    })
}

export function adaptPregnancyMilestone(milestone = {}) {
  return {
    code: milestone.code || milestone.milestone_code || null,
    title: milestone.title || 'Untitled Milestone',
    targetWeek: milestone.target_week ?? null,
    targetWeekLabel: milestone.target_week ?? '--',
    actualDate: milestone.actual_date || null,
    actualDateLabel: formatDate(milestone.actual_date),
    status: milestone.status || 'pending',
    statusLabel: PREGNANCY_MILESTONE_STATUS_LABELS[milestone.status] || 'Pending',
    notes: milestone.notes || '',
    raw: milestone,
  }
}

function adaptPatientSummary(summary = {}) {
  if (!summary) return null
  return {
    id: summary._id || summary.id || null,
    patientCode: summary.patient_code || '--',
    name: summary.full_name || 'Patient',
    phone: summary.phone || '--',
    category: summary.category || 'uncategorized',
    isActive: summary.is_active ?? true,
  }
}

export function adaptPregnancyDetail(payload = {}) {
  const pregnancy = payload.pregnancy || payload || {}
  const milestones = Array.isArray(payload.milestones) ? payload.milestones : pregnancy.milestones || []

  return {
    id: pregnancy._id || pregnancy.id || null,
    patientId: pregnancy.patient_id || payload.patient_summary?._id || null,
    doctorId: pregnancy.doctor_id || payload.doctor_summary?._id || null,
    sourceConsultationId: pregnancy.source_consultation_id || payload.source_consultation_summary?._id || null,
    pregnancyNumber: pregnancy.pregnancy_number ?? 1,
    status: pregnancy.status || 'active',
    statusLabel: PREGNANCY_STATUS_LABELS[pregnancy.status] || 'Active',
    conceptionType: pregnancy.conception_type || 'unknown',
    lmpDate: pregnancy.lmp_date || '',
    lmpDateLabel: formatDate(pregnancy.lmp_date),
    edd: pregnancy.edd || '',
    eddLabel: formatDate(pregnancy.edd),
    gestationalAgeWeeks: pregnancy.gestational_age_weeks ?? null,
    gestationalAgeDays: pregnancy.gestational_age_days ?? null,
    gestationalAgeLabel: formatGestationalAgeLabel(pregnancy.gestational_age_weeks, pregnancy.gestational_age_days),
    trimester: pregnancy.trimester ?? null,
    trimesterLabel: pregnancy.trimester ? `Trimester ${pregnancy.trimester}` : '--',
    gravida: pregnancy.gravida ?? '',
    para: pregnancy.para ?? '',
    abortions: pregnancy.abortions ?? '',
    livingChildren: pregnancy.living_children ?? '',
    highRisk: Boolean(pregnancy.high_risk),
    highRiskFlags: pregnancy.high_risk_flags || [],
    highRiskFlagsText: serializeHighRiskFlags(pregnancy.high_risk_flags || []),
    highRiskNotes: pregnancy.high_risk_notes || '',
    pregnancyNotes: pregnancy.pregnancy_notes || '',
    currentWeightKg: pregnancy.current_weight_kg ?? '',
    prePregnancyWeightKg: pregnancy.pre_pregnancy_weight_kg ?? '',
    bloodGroup: pregnancy.blood_group || '',
    rhFactor: pregnancy.rh_factor || 'unknown',
    milestones: milestones.map(adaptPregnancyMilestone),
    milestonesCompleted: milestones.filter((item) => item.status === 'completed').length,
    updatedAtLabel: formatDateTime(pregnancy.updated_at),
    createdAtLabel: formatDateTime(pregnancy.created_at),
    patientSummary: adaptPatientSummary(payload.patient_summary),
    doctorSummary: payload.doctor_summary
      ? {
          id: payload.doctor_summary._id || null,
          fullName: payload.doctor_summary.full_name || 'Doctor',
          speciality: payload.doctor_summary.speciality || '--',
        }
      : null,
    sourceConsultationSummary: payload.source_consultation_summary
      ? {
          id: payload.source_consultation_summary._id || null,
          status: payload.source_consultation_summary.status || 'draft',
          followUpRequired: Boolean(payload.source_consultation_summary.follow_up_required),
          followUpDate: payload.source_consultation_summary.follow_up_date || null,
          followUpDateLabel: formatDate(payload.source_consultation_summary.follow_up_date),
        }
      : null,
    raw: payload,
  }
}

export function createEmptyPregnancyForm({ patientId = null, doctorId = null, consultationId = null, defaults = {} } = {}) {
  return {
    patient_id: patientId,
    doctor_id: doctorId,
    source_consultation_id: consultationId,
    pregnancy_number: defaults.pregnancyNumber ?? 1,
    conception_type: defaults.conceptionType ?? 'spontaneous',
    lmp_date: defaults.lmpDate ?? '',
    edd: defaults.edd ?? '',
    gravida: defaults.gravida ?? '',
    para: defaults.para ?? '',
    abortions: defaults.abortions ?? '',
    living_children: defaults.livingChildren ?? '',
    pregnancy_notes: defaults.pregnancyNotes ?? '',
    current_weight_kg: defaults.currentWeightKg ?? '',
    pre_pregnancy_weight_kg: defaults.prePregnancyWeightKg ?? '',
    blood_group: defaults.bloodGroup ?? '',
    rh_factor: defaults.rhFactor ?? 'unknown',
    high_risk: defaults.highRisk ?? false,
    high_risk_flags_text: defaults.highRiskFlagsText ?? '',
    high_risk_notes: defaults.highRiskNotes ?? '',
    status: defaults.status ?? 'active',
  }
}

export function createPregnancyFormFromDetail(detail) {
  if (!detail) return createEmptyPregnancyForm()

  return createEmptyPregnancyForm({
    patientId: detail.patientId,
    doctorId: detail.doctorId,
    consultationId: detail.sourceConsultationId,
    defaults: detail,
  })
}

export function mapPregnancyCreatePayload(form = {}, context = {}) {
  const payload = {
    patient_id: context.patientId || form.patient_id || null,
    doctor_id: context.doctorId || form.doctor_id || null,
    source_consultation_id: context.consultationId || form.source_consultation_id || undefined,
    pregnancy_number: toNumberOrNull(form.pregnancy_number) || 1,
    conception_type: form.conception_type || 'unknown',
    lmp_date: toTrimmedOrNull(form.lmp_date),
    edd: toTrimmedOrNull(form.edd),
    gravida: toNumberOrNull(form.gravida),
    para: toNumberOrNull(form.para),
    abortions: toNumberOrNull(form.abortions),
    living_children: toNumberOrNull(form.living_children),
    pregnancy_notes: toTrimmedOrNull(form.pregnancy_notes),
    current_weight_kg: toNumberOrNull(form.current_weight_kg),
    pre_pregnancy_weight_kg: toNumberOrNull(form.pre_pregnancy_weight_kg),
    blood_group: toTrimmedOrNull(form.blood_group),
    rh_factor: form.rh_factor || 'unknown',
    high_risk: Boolean(form.high_risk),
    high_risk_flags: parseHighRiskFlagsInput(form.high_risk_flags_text),
    high_risk_notes: Boolean(form.high_risk) ? toTrimmedOrNull(form.high_risk_notes) : null,
  }

  if (!payload.source_consultation_id) {
    delete payload.source_consultation_id
  }

  return payload
}

export function mapPregnancyUpdatePayload(form = {}) {
  return {
    pregnancy_number: toNumberOrNull(form.pregnancy_number) || 1,
    conception_type: form.conception_type || 'unknown',
    lmp_date: toTrimmedOrNull(form.lmp_date),
    edd: toTrimmedOrNull(form.edd),
    gravida: toNumberOrNull(form.gravida),
    para: toNumberOrNull(form.para),
    abortions: toNumberOrNull(form.abortions),
    living_children: toNumberOrNull(form.living_children),
    pregnancy_notes: toTrimmedOrNull(form.pregnancy_notes),
    current_weight_kg: toNumberOrNull(form.current_weight_kg),
    pre_pregnancy_weight_kg: toNumberOrNull(form.pre_pregnancy_weight_kg),
    blood_group: toTrimmedOrNull(form.blood_group),
    rh_factor: form.rh_factor || 'unknown',
    status: form.status || 'active',
  }
}

export function mapPregnancyHighRiskPayload(form = {}) {
  const highRisk = Boolean(form.high_risk)
  return {
    high_risk: highRisk,
    high_risk_flags: highRisk ? parseHighRiskFlagsInput(form.high_risk_flags_text) : [],
    high_risk_notes: highRisk ? toTrimmedOrNull(form.high_risk_notes) : null,
  }
}

export function mapPregnancyMilestoneStatusPayload({ status, notes = '', actualDate = null } = {}) {
  return {
    status,
    ...(actualDate ? { actual_date: actualDate } : {}),
    ...(toTrimmedOrNull(notes) ? { notes: toTrimmedOrNull(notes) } : {}),
  }
}
