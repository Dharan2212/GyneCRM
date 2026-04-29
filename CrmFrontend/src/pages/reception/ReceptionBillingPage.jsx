import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Billing from '../../crm/pages/Billing.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'

export default function ReceptionBillingPage() {
  const goTo = useCrmPageNavigation('receptionist')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialState = useMemo(() => ({
    invoiceId: searchParams.get('invoiceId') || '',
    patientId: searchParams.get('patientId') || '',
    appointmentId: searchParams.get('appointmentId') || '',
    consultationId: searchParams.get('consultationId') || '',
    prescriptionId: searchParams.get('prescriptionId') || '',
    testOrderId: searchParams.get('testOrderId') || '',
    patientDocumentId: searchParams.get('patientDocumentId') || '',
  }), [searchParams])

  const handleOpenInvoice = ({ invoiceId, patientId } = {}) => {
    const next = new URLSearchParams()
    if (invoiceId) next.set('invoiceId', invoiceId)
    if (patientId) next.set('patientId', patientId)
    navigate(`/crm/receptionist/billing${next.toString() ? `?${next.toString()}` : ''}`)
  }

  return (
    <Billing
      goTo={goTo}
      initialInvoiceId={initialState.invoiceId}
      initialPatientId={initialState.patientId}
      initialContext={initialState}
      onOpenInvoice={handleOpenInvoice}
    />
  )
}
