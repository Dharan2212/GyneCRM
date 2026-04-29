import { useNavigate, useSearchParams } from 'react-router-dom'
import Consult from '../../crm/pages/Consult.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import {
  usePatientCategoryHistory,
  usePatientDetail,
  usePatientHub,
} from '../../modules/patients/patients.hooks.js'
import { useDoctorDashboard } from '../../modules/dashboard/doctorDashboard.hooks.js'
import {
  createConsultation,
  finaliseConsultation,
  updateConsultation,
  updateConsultationStatus,
} from '../../modules/consultations/consultations.api.js'
import {
  createEmptyConsultationForm,
  mapConsultationFinalisePayload,
  mapConsultationFormToPayload,
  mapConsultationStatusPayload,
} from '../../modules/consultations/consultations.adapters.js'
import {
  useConsultationDetail,
  useConsultationFollowUp,
  useConsultationWorkspace,
} from '../../modules/consultations/consultations.hooks.js'
import { updatePatientCategory } from '../../modules/patients/patients.api.js'

export default function DoctorFollowUpConsultationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const goTo = useCrmPageNavigation('doctor')

  const patientId = searchParams.get('patientId') || searchParams.get('selected') || null
  const consultationId = searchParams.get('consultationId') || null

  const patientState = usePatientDetail(patientId)
  const patientHubState = usePatientHub(patientId)
  const historyState = usePatientCategoryHistory(patientId, { enabled: Boolean(patientId) })
  const doctorDashboardState = useDoctorDashboard()
  const consultationState = useConsultationDetail(consultationId)
  const workspaceState = useConsultationWorkspace(consultationId)
  const followUpState = useConsultationFollowUp(consultationId)

  const doctorId = doctorDashboardState.data?.context?.doctorId || null
  const currentCategory = patientState.data?.summary?.category || 'uncategorized'

  const handleRetry = () => {
    patientState.reload()
    patientHubState.reload()
    historyState.reload()
    doctorDashboardState.reload()
    if (consultationId) {
      consultationState.reload()
      workspaceState.reload()
      followUpState.reload()
    }
  }


  const openPrescriptionBuilder = (nextPatientId, nextConsultationId) => {
    const effectivePatientId = nextPatientId || patientId
    const effectiveConsultationId = nextConsultationId || consultationId
    if (!effectivePatientId || !effectiveConsultationId) return

    const next = new URLSearchParams()
    next.set('patientId', effectivePatientId)
    next.set('consultationId', effectiveConsultationId)
    navigate(`/crm/doctor/prescriptions?${next.toString()}`)
  }

  const openPregnancyTracker = (nextPatientId) => {
    if (!nextPatientId) return

    const next = new URLSearchParams()
    next.set('patientId', nextPatientId)
    if (consultationId) {
      next.set('consultationId', consultationId)
    }

    navigate(`/crm/doctor/category-tracker?${next.toString()}`)
  }


  const openTestReports = (nextPatientId, nextConsultationId = null) => {
    const effectivePatientId = nextPatientId || patientId
    if (!effectivePatientId) return

    const next = new URLSearchParams()
    next.set('patientId', effectivePatientId)
    if (nextConsultationId) {
      next.set('consultationId', nextConsultationId)
    }
    navigate(`/crm/doctor/test-reports?${next.toString()}`)
  }

  const syncCategoryIfChanged = async (category) => {
    if (category?.value && category.value !== currentCategory) {
      await updatePatientCategory({
        id: patientId,
        payload: {
          category: category.value,
          reason: category.reason || '',
        },
      })
      await historyState.reload()
      await patientState.reload()
      await patientHubState.reload()
    }
  }

  const ensureConsultationId = async (form) => {
    if (consultationId) {
      await updateConsultation({
        id: consultationId,
        payload: mapConsultationFormToPayload(form, {
          patientId,
          doctorId,
          appointmentId: consultationState.data?.appointmentSummary?.id || null,
        }),
      })
      return consultationId
    }

    if (!doctorId) {
      const error = new Error('Doctor context could not be resolved. Refresh and try again.')
      error.status = 400
      throw error
    }

    const created = await createConsultation({
      payload: mapConsultationFormToPayload(form, {
        patientId,
        doctorId,
      }),
    })

    const nextConsultationId = created?._id || created?.id
    navigate(
      `/crm/doctor/consultations/follow-up?patientId=${encodeURIComponent(patientId)}&consultationId=${encodeURIComponent(nextConsultationId)}`,
      { replace: true },
    )

    return nextConsultationId
  }

  const handleSaveDraft = async ({ form, category }) => {
    const nextConsultationId = await ensureConsultationId(form)
    await syncCategoryIfChanged(category)
    if (consultationId) {
      await consultationState.reload()
      await workspaceState.reload()
    }
    return nextConsultationId
  }

  const handleUpdateStatus = async ({ form, status, category }) => {
    const nextConsultationId = await ensureConsultationId(form)
    await syncCategoryIfChanged(category)
    await updateConsultationStatus({
      id: nextConsultationId,
      payload: mapConsultationStatusPayload(status),
    })
    if (consultationId) {
      await consultationState.reload()
      await workspaceState.reload()
    }
    return nextConsultationId
  }

  const handleFinalise = async ({ form, category, followUp }) => {
    const nextConsultationId = await ensureConsultationId(form)
    await syncCategoryIfChanged(category)
    await finaliseConsultation({
      id: nextConsultationId,
      payload: mapConsultationFinalisePayload(followUp),
    })
    if (consultationId) {
      await consultationState.reload()
      await workspaceState.reload()
      await followUpState.reload()
    }
    return nextConsultationId
  }

  return (
    <Consult
      patient={patientState.data}
      patientHub={patientHubState.data}
      categoryHistory={historyState.data || []}
      consultation={consultationState.data}
      workspace={workspaceState.data}
      followUp={followUpState.data}
      draftTemplate={createEmptyConsultationForm({
        patientId,
        doctorId,
      })}
      hasConsultationId={Boolean(consultationId)}
      isLoading={Boolean(patientId) && (
        patientState.isLoading
        || patientHubState.isLoading
        || historyState.isLoading
        || doctorDashboardState.isLoading
        || (Boolean(consultationId) && (consultationState.isLoading || workspaceState.isLoading || followUpState.isLoading))
      )}
      error={
        patientState.error
        || patientHubState.error
        || historyState.error
        || doctorDashboardState.error
        || consultationState.error
        || workspaceState.error
        || followUpState.error
      }
      onRetry={handleRetry}
      onSaveDraft={handleSaveDraft}
      onUpdateStatus={handleUpdateStatus}
      onFinalise={handleFinalise}
      onOpenPregnancyTracker={openPregnancyTracker}
      onOpenPrescriptionBuilder={openPrescriptionBuilder}
      onOpenTestReports={openTestReports}
      goTo={goTo}
    />
  )
}
