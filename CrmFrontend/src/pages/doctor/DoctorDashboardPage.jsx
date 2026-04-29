import { useNavigate } from 'react-router-dom'
import DocDash from '../../crm/pages/DocDash.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { useDoctorDashboard } from '../../modules/dashboard/doctorDashboard.hooks.js'

export default function DoctorDashboardPage() {
  const navigate = useNavigate()
  const goTo = useCrmPageNavigation('doctor')
  const { data, isLoading, error, reload } = useDoctorDashboard()

  const openPatientHub = (patientId) => {
    const target = patientId
      ? `/crm/doctor/patients?selected=${encodeURIComponent(patientId)}`
      : '/crm/doctor/patients'

    navigate(target)
  }

  const openPregnancyTracker = (patientId, pregnancyId = null) => {
    const next = new URLSearchParams()
    if (patientId) {
      next.set('patientId', patientId)
    }
    if (pregnancyId) {
      next.set('pregnancyId', pregnancyId)
    }
    navigate(`/crm/doctor/category-tracker${next.toString() ? `?${next.toString()}` : ''}`)
  }


  const openTestReview = (patientId, testOrderId = null) => {
    const next = new URLSearchParams()
    if (patientId) {
      next.set('patientId', patientId)
    }
    if (testOrderId) {
      next.set('testOrderId', testOrderId)
    }
    navigate(`/crm/doctor/test-reports${next.toString() ? `?${next.toString()}` : ''}`)
  }

  return (
    <DocDash
      dashboard={data}
      isLoading={isLoading}
      error={error}
      onRetry={reload}
      onOpenPatient={openPatientHub}
      onOpenPregnancyTracker={openPregnancyTracker}
      onOpenTestReview={openTestReview}
      goTo={goTo}
    />
  )
}
