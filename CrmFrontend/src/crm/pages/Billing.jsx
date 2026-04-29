import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Bdg, CH, PH, SC } from '../atoms.jsx'
import { AsyncContent, EmptyState, ErrorState, PageLoadingState } from '../../modules/shared/ui/state/index.js'
import { DataTable, TableActions, TableActionButton, TableCell, TableRow, TableStack, TableToolbar } from '../../modules/shared/ui/table/index.js'
import { FormActions, FormCard, FormGrid, LoadingButton, SelectField, TextAreaField, TextField } from '../../modules/shared/ui/form/index.js'
import { PageToolbar, SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import { usePatientsList, useDebouncedValue } from '../../modules/patients/patients.hooks.js'
import PatientCommunicationPanel from '../../modules/shared/PatientCommunicationPanel.jsx'
import { formatCurrency } from '../../modules/shared/formatters/billing.formatters.js'
import { formatStatusLabel } from '../../modules/shared/formatters/status.formatters.js'
import {
  calculateInvoiceLineTotal,
  createInvoiceForm,
  createInvoiceItemForm,
  createInvoicePaymentForm,
  createInvoiceSendForm,
  mapInvoiceFormToPayload,
  mapInvoiceItemFormToPayload,
  mapInvoicePaymentFormToPayload,
  mapInvoiceSendFormToPayload,
  validateInvoiceForm,
  validateInvoiceItemForm,
  validateInvoicePaymentForm,
  validateInvoiceSendForm,
} from '../../modules/billing/billing.adapters.js'
import {
  useAddInvoiceItemsMutation,
  useCreateInvoiceMutation,
  useFinalizeInvoiceMutation,
  useInvoiceDetail,
  useInvoicePdfFoundationMutation,
  useInvoicesList,
  useRecordInvoicePaymentMutation,
  useSendInvoiceMutation,
  useUpdateInvoiceMutation,
} from '../../modules/billing/billing.hooks.js'

const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Voided' },
]

const ITEM_TYPE_OPTIONS = [
  { value: 'service', label: 'Service' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'recorded', label: 'Recorded' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'failed', label: 'Failed' },
  { value: 'reversed', label: 'Reversed' },
]

const SEND_CHANNEL_OPTIONS = [
  { value: 'print', label: 'Print' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
]

function formatApiError(error, fallback) {
  return error?.message || fallback
}

function toggleValue(list = [], value) {
  if (list.includes(value)) return list.filter((item) => item !== value)
  return [...list, value]
}

export default function Billing({
  goTo = () => {},
  initialInvoiceId = '',
  initialPatientId = '',
  initialContext = {},
  onOpenInvoice,
}) {
  const buildInitialInvoiceForm = () => createInvoiceForm({
    patient_id: initialPatientId,
    appointment_id: initialContext.appointmentId || '',
    consultation_id: initialContext.consultationId || '',
    prescription_id: initialContext.prescriptionId || '',
    test_order_id: initialContext.testOrderId || '',
    patient_document_id: initialContext.patientDocumentId || '',
  })

  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 50 })
  const [patientSearch, setPatientSearch] = useState('')
  const [invoiceForm, setInvoiceForm] = useState(() => buildInitialInvoiceForm())
  const [invoiceErrors, setInvoiceErrors] = useState({})
  const [itemForm, setItemForm] = useState(createInvoiceItemForm())
  const [itemErrors, setItemErrors] = useState({})
  const [paymentForm, setPaymentForm] = useState(createInvoicePaymentForm())
  const [paymentErrors, setPaymentErrors] = useState({})
  const [sendForm, setSendForm] = useState(createInvoiceSendForm())
  const [sendErrors, setSendErrors] = useState({})
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId || '')
  const { feedback, showSuccess, showError, showWarning, clearFeedback } = useFeedbackState()

  const debouncedPatientSearch = useDebouncedValue(patientSearch, 250)

  const patientsResource = usePatientsList({ search: debouncedPatientSearch, limit: 25 })
  const invoicesResource = useInvoicesList(filters)
  const selectedInvoice = useInvoiceDetail(selectedInvoiceId)

  const createMutation = useCreateInvoiceMutation()
  const addItemsMutation = useAddInvoiceItemsMutation()
  const updateMutation = useUpdateInvoiceMutation()
  const finalizeMutation = useFinalizeInvoiceMutation()
  const paymentMutation = useRecordInvoicePaymentMutation()
  const sendMutation = useSendInvoiceMutation()
  const pdfMutation = useInvoicePdfFoundationMutation()

  useEffect(() => {
    if (initialInvoiceId) setSelectedInvoiceId(initialInvoiceId)
  }, [initialInvoiceId])

  useEffect(() => {
    if (!selectedInvoiceId) {
      const firstId = invoicesResource.data?.items?.[0]?.id
      if (firstId) setSelectedInvoiceId(firstId)
    }
  }, [invoicesResource.data?.items?.[0]?.id, selectedInvoiceId])

  const patientOptions = useMemo(() => {
    const options = [{ v: '', l: 'Select patient' }]
    ;(patientsResource.data?.items || []).forEach((patient) => {
      options.push({ v: patient.id, l: `${patient.name} (${patient.patientCode || '--'})` })
    })
    return options
  }, [patientsResource.data?.items])

  const selectedDetail = selectedInvoice.data
  const invoiceRows = invoicesResource.data?.items || []

  const summaryCards = useMemo(() => {
    const items = invoiceRows
    const totalBilled = items.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0)
    const totalCollected = items.reduce((sum, row) => sum + (Number(row.paidAmount) || 0), 0)
    const totalDue = items.reduce((sum, row) => sum + (Number(row.dueAmount) || 0), 0)
    const issuedCount = items.filter((row) => ['issued', 'partially_paid', 'paid'].includes(row.status)).length
    return [
      { id: 'billed', icon: 'Rs', num: formatCurrency(totalBilled), label: 'Billed (loaded invoices)', ac: 'm' },
      { id: 'collected', icon: 'OK', num: formatCurrency(totalCollected), label: 'Collected', ac: 'ok' },
      { id: 'due', icon: 'Due', num: formatCurrency(totalDue), label: 'Amount Due', ac: totalDue > 0 ? 's' : 'ok' },
      { id: 'issued', icon: '#', num: String(issuedCount), label: 'Issued / Paid Bills', ac: 'g' },
    ]
  }, [invoiceRows])

  const canEditDraft = selectedDetail?.status === 'draft'
  const canFinalize = selectedDetail?.status === 'draft' && (selectedDetail?.items?.length || 0) > 0
  const canRecordPayment = ['issued', 'partially_paid'].includes(selectedDetail?.status)
  const canRequestPdf = ['issued', 'partially_paid', 'paid'].includes(selectedDetail?.status)
  const canSend = ['issued', 'partially_paid', 'paid'].includes(selectedDetail?.status)

  const handleInvoiceFieldChange = (field, value) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
    setInvoiceErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    clearFeedback()
  }

  const handleCreateInvoice = async (event) => {
    event.preventDefault()
    const validationErrors = validateInvoiceForm(invoiceForm)
    setInvoiceErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0) return

    try {
      const created = await createMutation.mutate({ payload: mapInvoiceFormToPayload(invoiceForm) })
      showSuccess(`Invoice draft created for ${created.patientSummary.fullName}.`, 'Invoice draft ready')
      setSelectedInvoiceId(created.id)
      invoicesResource.reload()
      if (typeof onOpenInvoice === 'function') {
        onOpenInvoice({ invoiceId: created.id, patientId: created.patientSummary.id })
      }
    } catch (error) {
      showError(formatApiError(error, 'Invoice could not be created.'), 'Invoice creation failed')
    }
  }


  const handleLoadSelectedDraft = () => {
    if (!selectedDetail) return
    setInvoiceForm(createInvoiceForm({
      patient_id: selectedDetail.patientSummary.id,
      doctor_id: selectedDetail.doctorSummary.id,
      appointment_id: selectedDetail.linkedSummary?.appointment?._id || '',
      consultation_id: selectedDetail.linkedSummary?.consultation?._id || '',
      prescription_id: selectedDetail.linkedSummary?.prescription?._id || '',
      test_order_id: selectedDetail.linkedSummary?.testOrder?._id || '',
      patient_document_id: selectedDetail.linkedSummary?.patientDocument?._id || '',
      invoice_date: selectedDetail.raw?.invoice_date || '',
      due_date: selectedDetail.raw?.due_date || '',
      currency: selectedDetail.currency || 'INR',
      notes: selectedDetail.notes || '',
      internal_notes: selectedDetail.internalNotes || '',
    }))
    setInvoiceErrors({})
    clearFeedback()
  }

  const handleUpdateInvoice = async () => {
    if (!selectedInvoiceId || !selectedDetail || selectedDetail.status !== 'draft') return
    const validationErrors = validateInvoiceForm(invoiceForm)
    setInvoiceErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0) return

    try {
      await updateMutation.mutate({ id: selectedInvoiceId, payload: mapInvoiceFormToPayload(invoiceForm) })
      showSuccess('Invoice draft updated successfully.', 'Draft updated')
      invoicesResource.reload()
      selectedInvoice.reload()
    } catch (error) {
      showError(formatApiError(error, 'Invoice draft could not be updated.'), 'Draft update failed')
    }
  }

  const handleItemFieldChange = (field, value) => {
    setItemForm((current) => ({ ...current, [field]: value }))
    setItemErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleAddItem = async (event) => {
    event.preventDefault()
    if (!selectedInvoiceId) {
      showWarning('Create or select an invoice first.', 'Select invoice')
      return
    }

    const validationErrors = validateInvoiceItemForm(itemForm)
    setItemErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0) return

    try {
      await addItemsMutation.mutate({ id: selectedInvoiceId, payload: { items: [mapInvoiceItemFormToPayload(itemForm)] } })
      showSuccess('Invoice item added successfully.', 'Item added')
      setItemForm(createInvoiceItemForm())
      invoicesResource.reload()
      selectedInvoice.reload()
    } catch (error) {
      showError(formatApiError(error, 'Invoice item could not be added.'), 'Item add failed')
    }
  }

  const handleFinalize = async () => {
    if (!selectedInvoiceId) return
    clearFeedback()
    try {
      await finalizeMutation.mutate({ id: selectedInvoiceId })
      showSuccess('Invoice finalized successfully.', 'Invoice finalised')
      invoicesResource.reload()
      selectedInvoice.reload()
    } catch (error) {
      showError(formatApiError(error, 'Invoice could not be finalized.'), 'Finalize failed')
    }
  }

  const handlePaymentFieldChange = (field, value) => {
    setPaymentForm((current) => ({ ...current, [field]: value }))
    setPaymentErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleRecordPayment = async (event) => {
    event.preventDefault()
    if (!selectedInvoiceId) return
    const validationErrors = validateInvoicePaymentForm(paymentForm)
    setPaymentErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0) return

    try {
      await paymentMutation.mutate({ id: selectedInvoiceId, payload: mapInvoicePaymentFormToPayload(paymentForm) })
      showSuccess('Payment recorded successfully.', 'Payment recorded')
      setPaymentForm(createInvoicePaymentForm())
      invoicesResource.reload()
      selectedInvoice.reload()
    } catch (error) {
      showError(formatApiError(error, 'Payment could not be recorded.'), 'Payment failed')
    }
  }

  const handleSendChannelToggle = (channel) => {
    setSendForm((current) => ({ ...current, send_channels: toggleValue(current.send_channels, channel) }))
    setSendErrors((current) => {
      if (!current.send_channels) return current
      const next = { ...current }
      delete next.send_channels
      return next
    })
  }

  const handleSendInvoice = async (event) => {
    event.preventDefault()
    if (!selectedInvoiceId) return
    const validationErrors = validateInvoiceSendForm(sendForm)
    setSendErrors(validationErrors)
    clearFeedback()
    if (Object.keys(validationErrors).length > 0) return

    try {
      await sendMutation.mutate({ id: selectedInvoiceId, payload: mapInvoiceSendFormToPayload(sendForm) })
      showSuccess('Invoice send state updated successfully.', 'Invoice send updated')
      setSendForm(createInvoiceSendForm())
      invoicesResource.reload()
      selectedInvoice.reload()
    } catch (error) {
      showError(formatApiError(error, 'Invoice could not be sent.'), 'Send failed')
    }
  }

  const handleFetchPdf = async () => {
    if (!selectedInvoiceId) return
    clearFeedback()
    try {
      await pdfMutation.mutate({ id: selectedInvoiceId })
      showSuccess('Invoice PDF foundation loaded. This backend currently returns foundation JSON, not a binary PDF download.', 'PDF foundation ready')
    } catch (error) {
      showError(formatApiError(error, 'Invoice PDF foundation could not be loaded.'), 'PDF request failed')
    }
  }

  if (patientsResource.isLoading && !patientsResource.data?.items?.length && invoicesResource.isLoading && !invoiceRows.length) {
    return <PageLoadingState title="Loading billing desk" message="Invoice records and patient lookup are being prepared." />
  }

  return (
    <div>
      <PH title="Billing and Finance" icon="billing" sub="Create invoices, add items, finalize, collect payment, and share invoice records." />

      <PageToolbar
        left={[
          <button key="desk" style={S.btn('ghost', true)} onClick={() => goTo('rx-queue')}>Back to Desk</button>,
          <button key="register" style={S.btn('primary', true)} onClick={() => goTo('rx-register')}>+ Register Patient</button>,
        ]}
        right={feedback ? [<FeedbackBar key="feedback" tone={feedback.tone} title={feedback.title} message={feedback.message} compact onDismiss={clearFeedback} />] : null}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 16 }}>
        {summaryCards.map((card) => (
          <SC key={card.id} icon={card.icon} num={card.num} label={card.label} ac={card.ac} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 16, alignItems: 'start' }}>
        <div>
          <form onSubmit={handleCreateInvoice}>
            <FormCard title="Create Invoice Draft" subtitle="Start a live billing draft linked to the selected patient before adding billable items." style={{ marginBottom: 14 }}>
              <FormGrid columns={2} gap={10}>
                <TextField
                  label="Search patient"
                  hint="Search by patient name, MR No, or phone"
                  inputProps={{ value: patientSearch, onChange: (event) => setPatientSearch(event.target.value), placeholder: 'Search patient' }}
                />
                <SelectField
                  label="Patient"
                  req
                  error={invoiceErrors.patient_id}
                  options={patientOptions}
                  selectProps={{ value: invoiceForm.patient_id, onChange: (event) => handleInvoiceFieldChange('patient_id', event.target.value) }}
                />
                <TextField
                  label="Invoice date"
                  error={invoiceErrors.invoice_date}
                  inputProps={{ type: 'date', value: invoiceForm.invoice_date, onChange: (event) => handleInvoiceFieldChange('invoice_date', event.target.value) }}
                />
                <TextField
                  label="Due date"
                  error={invoiceErrors.due_date}
                  inputProps={{ type: 'date', value: invoiceForm.due_date, onChange: (event) => handleInvoiceFieldChange('due_date', event.target.value) }}
                />
              </FormGrid>
              <div style={{ marginTop: 10 }}>
                <TextAreaField
                  label="Invoice notes"
                  textareaProps={{ value: invoiceForm.notes, onChange: (event) => handleInvoiceFieldChange('notes', event.target.value), placeholder: 'Optional patient-facing note' }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <TextAreaField
                  label="Internal notes"
                  textareaProps={{ value: invoiceForm.internal_notes, onChange: (event) => handleInvoiceFieldChange('internal_notes', event.target.value), placeholder: 'Optional internal note' }}
                />
              </div>
              <FormActions align="flex-start">
                <LoadingButton type="submit" label="Create invoice" loadingLabel="Creating..." loading={createMutation.isLoading} variant="primary" />
                <LoadingButton type="button" label="Update draft" loadingLabel="Updating..." loading={updateMutation.isLoading} onClick={handleUpdateInvoice} disabled={!selectedInvoiceId || selectedDetail?.status !== 'draft'} variant="outline" small />
                <button type="button" style={S.btn('ghost', true)} onClick={handleLoadSelectedDraft} disabled={!selectedInvoiceId || selectedDetail?.status !== 'draft'}>Load selected draft</button>
                <button type="button" style={S.btn('ghost', true)} onClick={() => { setInvoiceForm(buildInitialInvoiceForm()); setInvoiceErrors({}); clearFeedback() }}>Reset</button>
              </FormActions>
            </FormCard>
          </form>

          <SectionCard title="Selected Invoice" style={{ marginBottom: 14 }}>
            <AsyncContent
              isLoading={Boolean(selectedInvoiceId) && selectedInvoice.isLoading}
              error={selectedInvoice.error}
              isEmpty={!selectedInvoiceId || !selectedDetail}
              emptyTitle="No invoice selected"
              emptyMessage="Create a new invoice draft or open one from the list to manage items, finalize, payments, and send actions."
              onRetry={selectedInvoice.reload}
            >
              {selectedDetail ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Invoice</div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.invoiceNumber}</div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Patient</div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.patientSummary.fullName}</div>
                      <div style={{ fontSize: 11, color: C.kS }}>{selectedDetail.patientSummary.patientCode}</div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Status</div>
                      <div style={{ marginTop: 4 }}><Bdg type={getInvoiceBadgeType(selectedDetail.status)} sm>{selectedDetail.statusLabel}</Bdg></div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Totals</div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.totalAmountLabel}</div>
                      <div style={{ fontSize: 11, color: C.kS }}>Due {selectedDetail.amountDueLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: C.mP, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Subtotal</div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.subtotalAmountLabel}</div>
                    </div>
                    <div style={{ background: C.sL, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Discount + Tax</div>
                      <div style={{ fontWeight: 700, color: C.k }}>{selectedDetail.discountAmountLabel} / {selectedDetail.taxAmountLabel}</div>
                    </div>
                    <div style={{ background: C.tL, borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 11, color: C.kS }}>Send</div>
                      <div style={{ marginTop: 4 }}><Bdg type={getSendBadgeType(selectedDetail.sendStatus)} sm>{selectedDetail.sendStatusLabel}</Bdg></div>
                    </div>
                  </div>

                  {selectedDetail.notes ? <div style={{ fontSize: 12, color: C.kS, marginBottom: 8 }}>Notes: {selectedDetail.notes}</div> : null}
                  {selectedDetail.linkedSummary?.appointment || selectedDetail.linkedSummary?.consultation || selectedDetail.linkedSummary?.patientDocument ? (
                    <div style={{ fontSize: 12, color: C.kS, marginBottom: 8 }}>
                      Linked context: {[selectedDetail.linkedSummary.appointment ? 'Appointment' : null, selectedDetail.linkedSummary.consultation ? 'Consultation' : null, selectedDetail.linkedSummary.patientDocument ? 'Document' : null].filter(Boolean).join(' • ')}
                    </div>
                  ) : null}

                  <FormActions align="flex-start">
                    <LoadingButton label="Finalize invoice" loadingLabel="Finalizing..." loading={finalizeMutation.isLoading} onClick={handleFinalize} disabled={!canFinalize} variant="primary" />
                    <LoadingButton label="PDF foundation" loadingLabel="Loading foundation..." loading={pdfMutation.isLoading} onClick={handleFetchPdf} disabled={!canRequestPdf} variant="ghost" small />
                  </FormActions>
                  {!canFinalize && selectedDetail.status === 'draft' ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Add at least one invoice item before finalize.</div> : null}
                </div>
              ) : null}
            </AsyncContent>
          </SectionCard>

          <form onSubmit={handleAddItem}>
            <FormCard title="Add Item" subtitle="Add backend-aligned invoice item rows to the selected draft or issued invoice." style={{ marginBottom: 14 }}>
              <AsyncContent
                isEmpty={!selectedInvoiceId}
                emptyTitle="Select an invoice first"
                emptyMessage="Create or open a draft invoice before adding items."
                compact
              >
                <div>
                  <FormGrid columns={2} gap={10}>
                    <SelectField
                      label="Item type"
                      options={ITEM_TYPE_OPTIONS.map((option) => ({ v: option.value, l: option.label }))}
                      selectProps={{ value: itemForm.item_type, onChange: (event) => handleItemFieldChange('item_type', event.target.value), disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                    <TextField
                      label="Label"
                      req
                      error={itemErrors.label}
                      inputProps={{ value: itemForm.label, onChange: (event) => handleItemFieldChange('label', event.target.value), placeholder: 'Consultation fee / Lab panel', disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                    <TextField
                      label="Quantity"
                      error={itemErrors.quantity}
                      inputProps={{ type: 'number', min: 0, value: itemForm.quantity, onChange: (event) => handleItemFieldChange('quantity', event.target.value), disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                    <TextField
                      label="Unit price"
                      error={itemErrors.unit_price}
                      inputProps={{ type: 'number', min: 0, step: '0.01', value: itemForm.unit_price, onChange: (event) => handleItemFieldChange('unit_price', event.target.value), disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                    <TextField
                      label="Discount"
                      error={itemErrors.discount_amount}
                      inputProps={{ type: 'number', min: 0, step: '0.01', value: itemForm.discount_amount, onChange: (event) => handleItemFieldChange('discount_amount', event.target.value), disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                    <TextField
                      label="Tax"
                      error={itemErrors.tax_amount}
                      inputProps={{ type: 'number', min: 0, step: '0.01', value: itemForm.tax_amount, onChange: (event) => handleItemFieldChange('tax_amount', event.target.value), disabled: !canEditDraft || addItemsMutation.isLoading }}
                    />
                  </FormGrid>
                  <div style={{ marginTop: 10 }}>
                    <TextAreaField label="Description" textareaProps={{ value: itemForm.description, onChange: (event) => handleItemFieldChange('description', event.target.value), placeholder: 'Optional item description', disabled: !canEditDraft || addItemsMutation.isLoading }} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: C.kS }}>Computed line total: <strong style={{ color: C.k }}>{formatCurrency(calculateInvoiceLineTotal(itemForm), selectedDetail?.currency || 'INR')}</strong></div>
                  <FormActions align="flex-start">
                    <LoadingButton type="submit" label="Add item" loadingLabel="Adding item..." loading={addItemsMutation.isLoading} disabled={!canEditDraft} variant="primary" />
                    <button type="button" style={S.btn('ghost', true)} onClick={() => { setItemForm(createInvoiceItemForm()); setItemErrors({}) }}>Reset item</button>
                  </FormActions>
                  {!canEditDraft && selectedDetail?.status ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Items can only be added while the invoice is in draft status.</div> : null}
                </div>
              </AsyncContent>
            </FormCard>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <form onSubmit={handleRecordPayment}>
              <FormCard title="Record Payment" subtitle="Capture patient payment details without leaving the active invoice.">
                <AsyncContent
                  isEmpty={!selectedInvoiceId}
                  emptyTitle="Select an invoice first"
                  emptyMessage="Issued or partially paid invoices can accept payments."
                  compact
                >
                  <div>
                    <FormGrid columns={2} gap={10}>
                      <TextField
                        label="Payment date"
                        inputProps={{ type: 'date', value: paymentForm.payment_date, onChange: (event) => handlePaymentFieldChange('payment_date', event.target.value), disabled: !canRecordPayment || paymentMutation.isLoading }}
                      />
                      <TextField
                        label="Amount"
                        req
                        error={paymentErrors.amount}
                        inputProps={{ type: 'number', min: 0, step: '0.01', value: paymentForm.amount, onChange: (event) => handlePaymentFieldChange('amount', event.target.value), disabled: !canRecordPayment || paymentMutation.isLoading }}
                      />
                      <SelectField
                        label="Method"
                        req
                        error={paymentErrors.method}
                        options={PAYMENT_METHOD_OPTIONS.map((option) => ({ v: option.value, l: option.label }))}
                        selectProps={{ value: paymentForm.method, onChange: (event) => handlePaymentFieldChange('method', event.target.value), disabled: !canRecordPayment || paymentMutation.isLoading }}
                      />
                      <SelectField
                        label="Status"
                        options={PAYMENT_STATUS_OPTIONS.map((option) => ({ v: option.value, l: option.label }))}
                        selectProps={{ value: paymentForm.status, onChange: (event) => handlePaymentFieldChange('status', event.target.value), disabled: !canRecordPayment || paymentMutation.isLoading }}
                      />
                    </FormGrid>
                    <div style={{ marginTop: 10 }}>
                      <TextField label="Reference number" inputProps={{ value: paymentForm.reference_number, onChange: (event) => handlePaymentFieldChange('reference_number', event.target.value), placeholder: 'Optional reference', disabled: !canRecordPayment || paymentMutation.isLoading }} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <TextAreaField label="Payment notes" textareaProps={{ value: paymentForm.notes, onChange: (event) => handlePaymentFieldChange('notes', event.target.value), placeholder: 'Optional payment note', disabled: !canRecordPayment || paymentMutation.isLoading }} />
                    </div>
                    <FormActions align="flex-start">
                      <LoadingButton type="submit" label="Record payment" loadingLabel="Recording..." loading={paymentMutation.isLoading} disabled={!canRecordPayment} variant="primary" />
                    </FormActions>
                    {!canRecordPayment && selectedDetail?.status ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Payments can be recorded only after the invoice is issued.</div> : null}
                  </div>
                </AsyncContent>
              </FormCard>
            </form>

            <form onSubmit={handleSendInvoice}>
              <FormCard title="Send / PDF" subtitle="Use live send actions and inspect the PDF foundation response honestly.">
                <AsyncContent
                  isEmpty={!selectedInvoiceId}
                  emptyTitle="Select an invoice first"
                  emptyMessage="Issued or paid invoices can be shared with the patient."
                  compact
                >
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {SEND_CHANNEL_OPTIONS.map((option) => {
                        const active = sendForm.send_channels.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSendChannelToggle(option.value)}
                            disabled={!canSend || sendMutation.isLoading}
                            style={{
                              ...S.btn(active ? 'teal' : 'ghost', true),
                              opacity: !canSend ? 0.65 : 1,
                            }}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                    {sendErrors.send_channels ? <div style={{ fontSize: 11, color: C.er, marginBottom: 8 }}>{sendErrors.send_channels}</div> : null}
                    <TextAreaField
                      label="Send notes"
                      textareaProps={{ value: sendForm.send_notes, onChange: (event) => setSendForm((current) => ({ ...current, send_notes: event.target.value })), placeholder: 'Optional note for send history', disabled: !canSend || sendMutation.isLoading }}
                    />
                    <FormActions align="flex-start">
                      <LoadingButton type="submit" label="Send invoice" loadingLabel="Sending..." loading={sendMutation.isLoading} disabled={!canSend} variant="primary" />
                      <LoadingButton type="button" label="PDF foundation" loadingLabel="Loading..." loading={pdfMutation.isLoading} onClick={handleFetchPdf} disabled={!canRequestPdf} variant="ghost" small />
                    </FormActions>
                    {!canSend && selectedDetail?.status ? <div style={{ marginTop: 8, fontSize: 11, color: C.kS }}>Send is available once the invoice is issued or paid.</div> : null}
                    {pdfMutation.data ? (
                      <div style={{ marginTop: 10, background: C.bg, borderRadius: 8, padding: '10px 11px', fontSize: 12, color: C.kS }}>
                        <div style={{ fontWeight: 700, color: C.k, marginBottom: 4 }}>PDF foundation payload</div>
                        <div>Mode: {pdfMutation.data.mode}</div>
                        <div>Filename: {pdfMutation.data.filename}</div>
                        <div>Content type: {pdfMutation.data.contentType}</div>
                        <div style={{ marginTop: 6 }}>This backend currently returns foundation JSON rather than a binary file download.</div>
                      </div>
                    ) : null}
                  </div>
                </AsyncContent>
              </FormCard>
            </form>
          </div>

          <PatientCommunicationPanel
            patientId={selectedDetail?.patientSummary?.id || invoiceForm.patient_id || null}
            sourceType="invoice"
            title="Patient Communication History"
            emptyMessage="Invoice send actions for the selected patient will appear here once communication is recorded."
            limit={5}
          />
        </div>

        <div>
          <TableToolbar
            searchValue={filters.search}
            onSearchChange={(value) => setFilters((current) => ({ ...current, search: value, page: 1 }))}
            searchPlaceholder="Search invoice no or patient"
            filterValue={filters.status}
            onFilterChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
            filterOptions={INVOICE_STATUS_OPTIONS}
            actions={[
              <button key="reload" style={S.btn('ghost', true)} onClick={invoicesResource.reload}>Refresh</button>,
            ]}
          />

          <DataTable
            headers={[
              { key: 'invoiceNumber', label: 'Invoice' },
              { key: 'patientName', label: 'Patient' },
              { key: 'invoiceDate', label: 'Date' },
              { key: 'totalAmount', label: 'Amount', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            isLoading={invoicesResource.isLoading}
            error={invoicesResource.error}
            empty={invoiceRows.length === 0}
            emptyTitle="No invoices found"
            emptyMessage="Create a draft invoice to begin the receptionist billing workflow."
            onRetry={invoicesResource.reload}
          >
            <tbody>
              {invoiceRows.map((invoice) => {
                const active = invoice.id === selectedInvoiceId
                return (
                  <TableRow key={invoice.id} active={active}>
                    <TableCell strong style={{ color: C.m }}>{invoice.invoiceNumber}</TableCell>
                    <TableCell><TableStack title={invoice.patientName} subtitle={invoice.patientCode} compact /></TableCell>
                    <TableCell subtle>{invoice.invoiceDateLabel}</TableCell>
                    <TableCell align="right" strong>{invoice.totalAmountLabel}</TableCell>
                    <TableCell><Bdg type={getInvoiceBadgeType(invoice.status)} sm>{invoice.statusLabel}</Bdg></TableCell>
                    <TableCell>
                      <TableActions>
                        <TableActionButton
                          label="Open"
                          active={active}
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id)
                            if (typeof onOpenInvoice === 'function') {
                              onOpenInvoice({ invoiceId: invoice.id, patientId: invoice.patientId })
                            }
                          }}
                        />
                      </TableActions>
                    </TableCell>
                  </TableRow>
                )
              })}
            </tbody>
          </DataTable>

          <SectionCard title="Items and Payments" style={{ marginTop: 14 }}>
            <AsyncContent
              isLoading={Boolean(selectedInvoiceId) && selectedInvoice.isLoading}
              error={selectedInvoice.error}
              isEmpty={!selectedInvoiceId || !selectedDetail}
              emptyTitle="Select an invoice"
              emptyMessage="Invoice items and payment history will appear here once you select a draft or issued invoice."
              onRetry={selectedInvoice.reload}
              compact
            >
              {selectedDetail ? (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.k }}>Invoice items</div>
                    {selectedDetail.items.length === 0 ? (
                      <div style={{ marginTop: 8 }}><EmptyState title="No invoice items yet" message="Add item lines to this invoice draft before finalize." compact /></div>
                    ) : (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDetail.items.map((item) => (
                          <div key={item.id} style={{ border: `1px solid ${C.bd}`, borderRadius: 8, padding: '10px 12px', background: C.w }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                                <div style={{ fontSize: 11, color: C.kS }}>{item.itemTypeLabel} • Qty {item.quantity} • {item.unitPriceLabel}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: C.k }}>{item.lineTotalLabel}</div>
                                <Bdg type={item.status === 'active' ? 'done' : item.status === 'waived' ? 'partial' : 'high'} sm>{item.statusLabel}</Bdg>
                              </div>
                            </div>
                            {item.description ? <div style={{ fontSize: 11, color: C.kS, marginTop: 5 }}>{item.description}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.k }}>Payments</div>
                    {selectedDetail.payments.length === 0 ? (
                      <div style={{ marginTop: 8 }}><EmptyState title="No payments recorded" message="Payment entries will appear here after the invoice is issued and collected." compact /></div>
                    ) : (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDetail.payments.map((payment) => (
                          <div key={payment.id} style={{ border: `1px solid ${C.bd}`, borderRadius: 8, padding: '10px 12px', background: C.bg }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{payment.amountLabel}</div>
                                <div style={{ fontSize: 11, color: C.kS }}>{payment.paymentDateLabel} • {payment.methodLabel}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <Bdg type={getPaymentBadgeType(payment.status)} sm>{payment.statusLabel}</Bdg>
                                <div style={{ fontSize: 11, color: C.kS, marginTop: 4 }}>{payment.referenceNumber}</div>
                              </div>
                            </div>
                            {payment.notes ? <div style={{ fontSize: 11, color: C.kS, marginTop: 5 }}>{payment.notes}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </AsyncContent>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
