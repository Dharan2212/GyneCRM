import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Prescription from '../../crm/pages/Prescription.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { usePatientDetail } from '../../modules/patients/patients.hooks.js'
import { useConsultationDetail } from '../../modules/consultations/consultations.hooks.js'
import { useDoctorDashboard } from '../../modules/dashboard/doctorDashboard.hooks.js'
import {
  createPrescription,
  getPrescriptionPdf,
  issuePrescription,
  sendPrescription,
  voidPrescription,
} from '../../modules/prescriptions/prescriptions.api.js'
import {
  adaptPrescriptionPdfFoundation,
  createEmptyPrescriptionForm,
  mapPrescriptionFormToPayload,
} from '../../modules/prescriptions/prescriptions.adapters.js'
import { usePrescriptionDetail } from '../../modules/prescriptions/prescriptions.hooks.js'

export default function DoctorPrescriptionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const goTo = useCrmPageNavigation('doctor')
  const [pdfFoundation, setPdfFoundation] = useState(null)

  const patientIdParam = searchParams.get('patientId') || searchParams.get('selected') || null
  const consultationIdParam = searchParams.get('consultationId') || null
  const prescriptionId = searchParams.get('prescriptionId') || null

  const prescriptionState = usePrescriptionDetail(prescriptionId)
  const resolvedConsultationId = consultationIdParam || prescriptionState.data?.consultationSummary?.id || null
  const consultationState = useConsultationDetail(resolvedConsultationId)
  const resolvedPatientId = patientIdParam || consultationState.data?.patientSummary?.id || prescriptionState.data?.patientSummary?.id || null
  const patientState = usePatientDetail(resolvedPatientId)
  const doctorDashboardState = useDoctorDashboard()

  const doctorId = consultationState.data?.doctorSummary?.id
    || prescriptionState.data?.doctorSummary?.id
    || doctorDashboardState.data?.context?.doctorId
    || null

  const appointmentId = consultationState.data?.appointmentSummary?.id || prescriptionState.data?.appointmentSummary?.id || null

  useEffect(() => {
    setPdfFoundation(null)
  }, [prescriptionId])

  const handleRetry = () => {
    prescriptionState.reload()
    consultationState.reload()
    patientState.reload()
    doctorDashboardState.reload()
  }

  const draftTemplate = useMemo(() => createEmptyPrescriptionForm({
    patientId: resolvedPatientId,
    doctorId,
    consultationId: resolvedConsultationId,
    appointmentId,
    diagnosisSummary: consultationState.data?.summary || '',
    adviceNotes: consultationState.data?.form?.advice || '',
    generalInstructions: consultationState.data?.form?.notes || '',
  }), [resolvedPatientId, doctorId, resolvedConsultationId, appointmentId, consultationState.data?.summary, consultationState.data?.form?.advice, consultationState.data?.form?.notes])

  const openConsultation = () => {
    if (!resolvedPatientId) {
      goTo('patient-hub')
      return
    }

    const next = new URLSearchParams()
    next.set('patientId', resolvedPatientId)
    if (resolvedConsultationId) {
      next.set('consultationId', resolvedConsultationId)
    }

    navigate(`/crm/doctor/consultations/follow-up?${next.toString()}`)
  }

  const handleCreatePrescription = async (formValues) => {
    if (!resolvedPatientId || !resolvedConsultationId || !doctorId) {
      const error = new Error('Patient, consultation, and doctor context are required before creating a prescription.')
      error.status = 400
      throw error
    }

    const created = await createPrescription({
      payload: mapPrescriptionFormToPayload({
        ...formValues,
        patient_id: resolvedPatientId,
        doctor_id: doctorId,
        consultation_id: resolvedConsultationId,
        appointment_id: appointmentId,
      }),
    })

    const nextId = created?._id || created?.id
    const next = new URLSearchParams()
    next.set('patientId', resolvedPatientId)
    next.set('consultationId', resolvedConsultationId)
    next.set('prescriptionId', nextId)
    navigate(`/crm/doctor/prescriptions?${next.toString()}`, { replace: true })
    return created
  }

  const handleIssuePrescription = async () => {
    const result = await issuePrescription({ id: prescriptionId, payload: {} })
    await prescriptionState.reload()
    return result
  }

  const handleVoidPrescription = async (payload) => {
    const result = await voidPrescription({ id: prescriptionId, payload })
    await prescriptionState.reload()
    return result
  }

  const handleSendPrescription = async (payload) => {
    const result = await sendPrescription({ id: prescriptionId, payload })
    await prescriptionState.reload()
    return result
  }

  const handleLoadPdfFoundation = async () => {
    const payload = await getPrescriptionPdf({ id: prescriptionId })
    const adapted = adaptPrescriptionPdfFoundation(payload)
    setPdfFoundation(adapted)
    return adapted
  }

  return (
    <Prescription
      patient={patientState.data}
      consultation={consultationState.data}
      prescription={prescriptionState.data}
      draftTemplate={draftTemplate}
      pdfFoundation={pdfFoundation}
      isLoading={Boolean(resolvedPatientId || resolvedConsultationId || prescriptionId) && (
        patientState.isLoading
        || consultationState.isLoading
        || prescriptionState.isLoading
        || (!doctorId && doctorDashboardState.isLoading)
      )}
      error={patientState.error || consultationState.error || prescriptionState.error || (!doctorId ? doctorDashboardState.error : null)}
      onRetry={handleRetry}
      onCreatePrescription={handleCreatePrescription}
      onIssuePrescription={handleIssuePrescription}
      onVoidPrescription={handleVoidPrescription}
      onSendPrescription={handleSendPrescription}
      onLoadPdfFoundation={handleLoadPdfFoundation}
      onOpenConsultation={openConsultation}
      goTo={goTo}
    />
  )
}
