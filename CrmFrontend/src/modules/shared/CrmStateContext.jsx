import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  applyTemplateCategoryTransition,
  applyTemplatePatientMutation,
  calculateTemplateMetrics,
  createTemplatePatient,
  getInitialSelectedTemplatePatientId,
  getInitialTemplatePatients,
  selectTemplatePatient,
} from './mock/crmTemplateRepository.js'

const CrmStateContext = createContext(null)

const initialPatients = getInitialTemplatePatients()

export function CrmStateProvider({ children }) {
  const [patients, setPatients] = useState(initialPatients)
  const [selectedPatientId, setSelectedPatientId] = useState(getInitialSelectedTemplatePatientId(initialPatients))

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || patients[0] || null,
    [patients, selectedPatientId],
  )

  const selectPatient = useCallback((patientOrId) => {
    const nextId = selectTemplatePatient(patientOrId)
    if (nextId) {
      setSelectedPatientId(nextId)
    }
  }, [])

  const addPatient = useCallback((patient) => {
    const nextPatient = createTemplatePatient(patient)
    setPatients((currentPatients) => [...currentPatients, nextPatient])
    setSelectedPatientId(nextPatient.id)
  }, [])

  const categorizePatient = useCallback((patientId, category, history, vitals) => {
    setPatients((currentPatients) => currentPatients.map((patient) => {
      if (patient.id !== patientId) {
        return patient
      }

      return applyTemplateCategoryTransition(patient, category, history, vitals)
    }))
  }, [])

  const updatePatient = useCallback((patientId, action, payload) => {
    setPatients((currentPatients) => currentPatients.map((patient) => {
      if (patient.id !== patientId) {
        return patient
      }

      return applyTemplatePatientMutation(patient, action, payload)
    }))
  }, [])

  const metrics = useMemo(() => calculateTemplateMetrics(patients), [patients])

  const value = useMemo(() => ({
    dataSource: 'template-mock',
    patients,
    selectedPatient,
    selectedPatientId,
    metrics,
    selectPatient,
    addPatient,
    categorizePatient,
    updatePatient,
  }), [
    addPatient,
    categorizePatient,
    metrics,
    patients,
    selectPatient,
    selectedPatient,
    selectedPatientId,
    updatePatient,
  ])

  return <CrmStateContext.Provider value={value}>{children}</CrmStateContext.Provider>
}

export function useCrmState() {
  const context = useContext(CrmStateContext)

  if (!context) {
    throw new Error('useCrmState must be used within CrmStateProvider.')
  }

  return context
}
