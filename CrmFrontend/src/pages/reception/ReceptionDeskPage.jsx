import { useNavigate } from 'react-router-dom'
import RxQueue from '../../crm/pages/RxQueue.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { useReceptionDashboard } from '../../modules/dashboard/receptionDashboard.hooks.js'

export default function ReceptionDeskPage() {
  const goTo = useCrmPageNavigation('receptionist')
  const navigate = useNavigate()
  const { data, isLoading, error, reload } = useReceptionDashboard()

  const handleOpenAppointment = ({ appointmentId, patientId } = {}) => {
    const search = new URLSearchParams()
    if (appointmentId) search.set('appointmentId', appointmentId)
    if (patientId) search.set('patientId', patientId)
    navigate(`/crm/receptionist/appointments${search.toString() ? `?${search.toString()}` : ''}`)
  }

  return (
    <RxQueue
      dashboard={data}
      isLoading={isLoading}
      error={error}
      onRetry={reload}
      goTo={goTo}
      onOpenAppointment={handleOpenAppointment}
    />
  )
}
