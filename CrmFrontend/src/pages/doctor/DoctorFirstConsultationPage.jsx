import { useNavigate, useSearchParams } from 'react-router-dom'
import FirstConsult from '../../crm/pages/FirstConsult.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { usePatientCategoryHistory, usePatientDetail } from '../../modules/patients/patients.hooks.js'
import { createConsultation } from '../../modules/consultations/consultations.api.js'
import { mapConsultationFormToPayload } from '../../modules/consultations/consultations.adapters.js'
import { updatePatientCategory } from '../../modules/patients/patients.api.js'
import { useDoctorDashboard } from '../../modules/dashboard/doctorDashboard.hooks.js'

export default function DoctorFirstConsultationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const goTo = useCrmPageNavigation('doctor')

  const patientId = searchParams.get('patientId') || searchParams.get('selected') || null

  const patientState = usePatientDetail(patientId)
  const historyState = usePatientCategoryHistory(patientId, { enabled: Boolean(patientId) })
  const doctorDashboardState = useDoctorDashboard()

  const doctorId = doctorDashboardState.data?.context?.doctorId || null
  const currentCategory = patientState.data?.summary?.category || 'uncategorized'

  const handleRetry = () => {
    patientState.reload()
    historyState.reload()
    doctorDashboardState.reload()
  }

  const handleCreateConsultation = async ({ form, category }) => {
    if (!patientId) {
      const error = new Error('Select a patient before starting consultation.')
      error.status = 400
      throw error
    }

    if (!doctorId) {
      const error = new Error('Doctor context could not be resolved. Refresh and try again.')
      error.status = 400
      throw error
    }

    const consultation = await createConsultation({
      payload: mapConsultationFormToPayload(form, {
        patientId,
        doctorId,
      }),
    })

    if (category?.value && category.value !== currentCategory) {
      await updatePatientCategory({
        id: patientId,
        payload: {
          category: category.value,
          reason: category.reason || '',
        },
      })
    }

    const consultationId = consultation?._id || consultation?.id
    navigate(
      `/crm/doctor/consultations/follow-up?patientId=${encodeURIComponent(patientId)}&consultationId=${encodeURIComponent(consultationId)}`,
      { replace: true },
    )

    return consultation
  }

  return (
    <FirstConsult
      patient={patientState.data}
      categoryHistory={historyState.data || []}
      isLoading={Boolean(patientId) && (patientState.isLoading || historyState.isLoading || doctorDashboardState.isLoading)}
      error={patientState.error || historyState.error || doctorDashboardState.error}
      onRetry={handleRetry}
      onCreateConsultation={handleCreateConsultation}
      goTo={goTo}
    />
  )
}
