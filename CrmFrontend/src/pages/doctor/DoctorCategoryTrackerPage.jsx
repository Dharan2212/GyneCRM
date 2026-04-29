import { useNavigate, useSearchParams } from 'react-router-dom'
import CatTracker from '../../crm/pages/CatTracker.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { usePatientDetail } from '../../modules/patients/patients.hooks.js'
import { useDoctorDashboard } from '../../modules/dashboard/doctorDashboard.hooks.js'
import {
  createPregnancy,
  updatePregnancy,
  updatePregnancyHighRisk,
  updatePregnancyMilestoneStatus,
} from '../../modules/pregnancies/pregnancies.api.js'
import {
  mapPregnancyCreatePayload,
  mapPregnancyHighRiskPayload,
  mapPregnancyMilestoneStatusPayload,
  mapPregnancyUpdatePayload,
} from '../../modules/pregnancies/pregnancies.adapters.js'
import { usePregnancyDetail, usePregnancyMilestones } from '../../modules/pregnancies/pregnancies.hooks.js'

export default function DoctorCategoryTrackerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const goTo = useCrmPageNavigation('doctor')

  const patientId = searchParams.get('patientId') || searchParams.get('selected') || null
  const pregnancyId = searchParams.get('pregnancyId') || null
  const consultationId = searchParams.get('consultationId') || null

  const patientState = usePatientDetail(patientId)
  const dashboardState = useDoctorDashboard()
  const pregnancyState = usePregnancyDetail(pregnancyId)
  const milestonesState = usePregnancyMilestones(pregnancyId)

  const doctorId = dashboardState.data?.context?.doctorId || null

  const openPatientHub = (nextPatientId) => {
    if (!nextPatientId) {
      goTo('patient-hub')
      return
    }

    navigate(`/crm/doctor/patients?selected=${encodeURIComponent(nextPatientId)}`)
  }

  const openConsultation = (nextPatientId) => {
    if (!nextPatientId) {
      goTo('consultation')
      return
    }

    if (consultationId) {
      navigate(`/crm/doctor/consultations/follow-up?patientId=${encodeURIComponent(nextPatientId)}&consultationId=${encodeURIComponent(consultationId)}`)
      return
    }

    navigate(`/crm/doctor/consultations/follow-up?patientId=${encodeURIComponent(nextPatientId)}`)
  }

  const handleRetry = () => {
    patientState.reload()
    dashboardState.reload()
    if (pregnancyId) {
      pregnancyState.reload()
      milestonesState.reload()
    }
  }

  const refreshPregnancy = async () => {
    await Promise.all([
      pregnancyState.reload(),
      milestonesState.reload(),
      patientState.reload(),
    ])
  }

  const handleCreatePregnancy = async (form) => {
    if (!patientId) {
      const error = new Error('Select a patient before starting pregnancy tracking.')
      error.status = 400
      throw error
    }

    if (!doctorId) {
      const error = new Error('Doctor context could not be resolved. Refresh and try again.')
      error.status = 400
      throw error
    }

    const created = await createPregnancy({
      payload: mapPregnancyCreatePayload(form, {
        patientId,
        doctorId,
        consultationId,
      }),
    })

    const nextPregnancyId = created?.pregnancy?._id || created?.pregnancy?.id || created?._id || created?.id

    if (nextPregnancyId) {
      const next = new URLSearchParams(searchParams.toString())
      next.set('patientId', patientId)
      next.set('pregnancyId', nextPregnancyId)
      if (consultationId) {
        next.set('consultationId', consultationId)
      }
      navigate(`/crm/doctor/category-tracker?${next.toString()}`, { replace: true })
    }

    return created
  }

  const handleUpdatePregnancy = async (form) => {
    if (!pregnancyId) {
      const error = new Error('Create a pregnancy record first.')
      error.status = 400
      throw error
    }

    await updatePregnancy({
      id: pregnancyId,
      payload: mapPregnancyUpdatePayload(form),
    })

    await refreshPregnancy()
  }

  const handleUpdateHighRisk = async (form) => {
    if (!pregnancyId) {
      const error = new Error('Create a pregnancy record first.')
      error.status = 400
      throw error
    }

    await updatePregnancyHighRisk({
      id: pregnancyId,
      payload: mapPregnancyHighRiskPayload(form),
    })

    await refreshPregnancy()
  }

  const handleUpdateMilestoneStatus = async (milestoneCode, status) => {
    if (!pregnancyId) {
      const error = new Error('Create a pregnancy record first.')
      error.status = 400
      throw error
    }

    await updatePregnancyMilestoneStatus({
      id: pregnancyId,
      milestoneCode,
      payload: mapPregnancyMilestoneStatusPayload({ status }),
    })

    await refreshPregnancy()
  }

  return (
    <CatTracker
      patient={patientState.data}
      pregnancy={pregnancyState.data}
      milestones={milestonesState.data || []}
      consultationId={consultationId}
      isLoading={Boolean(patientId) && (patientState.isLoading || dashboardState.isLoading || (Boolean(pregnancyId) && (pregnancyState.isLoading || milestonesState.isLoading)))}
      error={patientState.error || dashboardState.error || pregnancyState.error || milestonesState.error}
      onRetry={handleRetry}
      onCreatePregnancy={handleCreatePregnancy}
      onUpdatePregnancy={handleUpdatePregnancy}
      onUpdateHighRisk={handleUpdateHighRisk}
      onUpdateMilestoneStatus={handleUpdateMilestoneStatus}
      onOpenPatientHub={openPatientHub}
      onOpenConsultation={openConsultation}
    />
  )
}
