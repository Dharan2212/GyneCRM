import {
  INIT_PATIENTS,
  calcGynac,
  calcIVF,
  calcPreg,
} from '../../../crm/data.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizePatientSelection(patientOrId) {
  if (!patientOrId) return null
  return typeof patientOrId === 'string' ? patientOrId : patientOrId.id
}

export function getInitialTemplatePatients() {
  return clone(INIT_PATIENTS)
}

export function getInitialSelectedTemplatePatientId(patients) {
  return patients[1]?.id || patients[0]?.id || null
}

export function selectTemplatePatient(patientOrId) {
  return normalizePatientSelection(patientOrId)
}

export function createTemplatePatient(patient) {
  return clone(patient)
}

export function applyTemplateCategoryTransition(patient, category, history = {}, vitals = {}) {
  const nextPatient = {
    ...patient,
    status: 'active',
    cat: category,
  }

  if (category === 'Pregnancy') {
    nextPatient.lmp = history.lmp
    nextPatient.gpa = history.gpa
    nextPatient.highRisk = history.highRisk
    if (history.lmp) {
      nextPatient.pregnancyDates = calcPreg(history.lmp)
    }
  } else if (category === 'Infertility') {
    nextPatient.ivfCycleStart = history.ivfStart || new Date().toISOString().split('T')[0]
    nextPatient.ivfCycleNum = Number(history.ivfCycleNum) || 1
    nextPatient.ivfStage = 'Stimulation'
    nextPatient.ivfDates = calcIVF(nextPatient.ivfCycleStart)
  } else if (category === 'Gynac') {
    nextPatient.complaint = history.diagnosis || 'Under evaluation'
    nextPatient.gynacDates = calcGynac(patient.firstVisitDate)
  }

  nextPatient.consultations = [
    {
      date: new Date().toISOString().split('T')[0],
      bp: vitals?.bp || '',
      weight: vitals?.weight || '',
      notes: `First consultation. Category: ${category}. ${history.complaint || ''}`,
      rx: [],
    },
  ]

  return nextPatient
}

export function applyTemplatePatientMutation(patient, action, payload) {
  if (action === 'addTest') {
    return { ...patient, tests: [...(patient.tests || []), payload] }
  }

  if (action === 'updateTest') {
    return {
      ...patient,
      tests: (patient.tests || []).map((test) => (test.id === payload.id ? { ...test, ...payload } : test)),
    }
  }

  if (action === 'addConsultation') {
    return { ...patient, consultations: [...(patient.consultations || []), payload] }
  }

  return patient
}

export function calculateTemplateMetrics(patients) {
  return {
    newPatients: patients.filter((patient) => patient.status === 'new').length,
    pendingReview: patients.flatMap((patient) => (patient.tests || []).filter((test) => test.status === 'uploaded')).length,
    pendingUpload: patients.flatMap((patient) => (patient.tests || []).filter((test) => test.status === 'ordered')).length,
  }
}
