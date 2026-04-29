import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RxAppointments from '../../crm/pages/RxAppointments.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'

export default function ReceptionAppointmentsPage() {
  const goTo = useCrmPageNavigation('receptionist')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialState = useMemo(() => ({
    appointmentId: searchParams.get('appointmentId') || '',
    patientId: searchParams.get('patientId') || '',
  }), [searchParams])

  const handleOpenAppointment = ({ appointmentId, patientId } = {}) => {
    const next = new URLSearchParams()
    if (appointmentId) next.set('appointmentId', appointmentId)
    if (patientId) next.set('patientId', patientId)
    navigate(`/crm/receptionist/appointments${next.toString() ? `?${next.toString()}` : ''}`)
  }

  return (
    <RxAppointments
      goTo={goTo}
      initialAppointmentId={initialState.appointmentId}
      initialPatientId={initialState.patientId}
      onOpenAppointment={handleOpenAppointment}
    />
  )
}
