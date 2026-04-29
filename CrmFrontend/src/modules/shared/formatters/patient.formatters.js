import { getPatientCategoryLabel } from '../enums/patient.enums.js'
import { calculateAge } from './dateTime.js'

export function formatPatientDisplayName(patient) {
  return patient?.full_name || patient?.name || patient?.patient_name || 'Unknown Patient'
}

export function formatPatientCode(patient) {
  return patient?.patient_code || patient?.id || patient?._id || '--'
}

export function formatPatientSummary(patient) {
  const age = calculateAge(patient?.date_of_birth)
  return {
    id: patient?._id || patient?.id || null,
    patientCode: formatPatientCode(patient),
    name: formatPatientDisplayName(patient),
    age,
    ageLabel: age === null ? '--' : `${age} yrs`,
    phone: patient?.phone || patient?.family_whatsapp || '--',
    category: patient?.category || 'uncategorized',
    categoryLabel: getPatientCategoryLabel(patient?.category || 'uncategorized'),
    bloodGroup: patient?.blood_group || patient?.blood || '--',
    isActive: patient?.is_active ?? true,
  }
}
