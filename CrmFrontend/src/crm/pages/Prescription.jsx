import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Av, Bdg, Inp, PH, Sel, TA } from '../atoms.jsx'
import { AsyncContent, EmptyState } from '../../modules/shared/ui/state/index.js'
import { FormActions, LoadingButton } from '../../modules/shared/ui/form/index.js'
import { SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import {
  adaptPrescriptionItem,
  createEmptyPrescriptionForm,
  createEmptyPrescriptionItem,
} from '../../modules/prescriptions/prescriptions.adapters.js'

const DURATION_OPTIONS = [
  { v: 'days', l: 'Days' },
  { v: 'weeks', l: 'Weeks' },
  { v: 'months', l: 'Months' },
]

const ROUTE_OPTIONS = [
  { v: 'oral', l: 'Oral' },
  { v: 'topical', l: 'Topical' },
  { v: 'vaginal', l: 'Vaginal' },
  { v: 'injectable', l: 'Injectable' },
  { v: 'other', l: 'Other' },
]

const FREQUENCY_OPTIONS = [
  { v: 'Once daily', l: 'Once daily' },
  { v: 'Twice daily', l: 'Twice daily' },
  { v: 'Three times daily', l: 'Three times daily' },
  { v: 'At bedtime', l: 'At bedtime' },
  { v: 'As needed', l: 'As needed' },
]

const SEND_CHANNEL_OPTIONS = ['print', 'whatsapp', 'email', 'sms']

function buildInitialState({ patient, consultation, draftTemplate, prescription }) {
  if (prescription?.id) {
    return {
      form: createEmptyPrescriptionForm({
        patientId: prescription.patientSummary?.id,
        doctorId: prescription.doctorSummary?.id,
        consultationId: prescription.consultationSummary?.id,
        appointmentId: prescription.appointmentSummary?.id,
        prescriptionDate: prescription.prescriptionDate ? String(prescription.prescriptionDate).slice(0, 10) : undefined,
        diagnosisSummary: prescription.diagnosisSummary,
        adviceNotes: prescription.adviceNotes,
        generalInstructions: prescription.generalInstructions,
        items: (prescription.items || []).map((item) => ({
          medicine_name: item.medicineName === '--' ? '' : item.medicineName,
          generic_name: item.genericName,
          formulation: item.formulation,
          strength: item.strength,
          dose: item.dose === '--' ? '' : item.dose,
          route: item.route === '--' ? 'oral' : item.route,
          frequency: item.frequency === '--' ? 'Once daily' : item.frequency,
          duration_value: item.durationValue,
          duration_unit: item.durationUnit || 'days',
          quantity: item.quantity,
          instructions: item.instructions,
          before_food: item.beforeFood,
          after_food: item.afterFood,
          morning: item.raw?.morning || false,
          afternoon: item.raw?.afternoon || false,
          evening: item.raw?.evening || false,
          night: item.raw?.night || false,
          is_prn: item.isPrn,
          prn_reason: item.prnReason,
          notes: item.notes,
          status: item.status,
        })),
      }),
      sendChannels: prescription.sendChannels?.length ? prescription.sendChannels : ['whatsapp'],
      sendNotes: prescription.raw?.send_notes || '',
      voidReason: prescription.voidReason || '',
    }
  }

  return {
    form: draftTemplate || createEmptyPrescriptionForm({
      patientId: patient?.summary?.id || null,
      consultationId: consultation?.id || null,
      appointmentId: consultation?.appointmentSummary?.id || null,
      diagnosisSummary: consultation?.summary || '',
      adviceNotes: consultation?.form?.advice || '',
      generalInstructions: consultation?.form?.notes || '',
    }),
    sendChannels: ['whatsapp'],
    sendNotes: '',
    voidReason: '',
  }
}

function getPreviewItems(form, prescription) {
  if (prescription?.items?.length) {
    return prescription.items
  }

  return (form.items || []).map((item, index) => adaptPrescriptionItem(item, index))
}

export default function Prescription({
  patient,
  consultation,
  prescription,
  draftTemplate,
  pdfFoundation,
  isLoading,
  error,
  onRetry,
  onCreatePrescription,
  onIssuePrescription,
  onVoidPrescription,
  onSendPrescription,
  onLoadPdfFoundation,
  onOpenConsultation,
  goTo,
}) {
  const [form, setForm] = useState(createEmptyPrescriptionForm())
  const [sendChannels, setSendChannels] = useState(['whatsapp'])
  const [sendNotes, setSendNotes] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [actionMode, setActionMode] = useState(null)
  const [actionError, setActionError] = useState(null)
  const { feedback, showSuccess, clearFeedback } = useFeedbackState()
  const [validationError, setValidationError] = useState(null)

  const patientSummary = patient?.summary || prescription?.patientSummary || null
  const consultationSummary = consultation || (prescription?.consultationSummary ? {
    statusLabel: prescription.consultationSummary.statusLabel,
    chiefComplaint: prescription.consultationSummary.chiefComplaint,
    doctorSummary: prescription.doctorSummary,
  } : null)
  const previewItems = useMemo(() => getPreviewItems(form, prescription), [form, prescription])
  const isExistingPrescription = Boolean(prescription?.id)

  useEffect(() => {
    const initial = buildInitialState({ patient, consultation, draftTemplate, prescription })
    setForm(initial.form)
    setSendChannels(initial.sendChannels)
    setSendNotes(initial.sendNotes)
    setVoidReason(initial.voidReason)
    setActionError(null)
    clearFeedback()
    setValidationError(null)
  }, [patientSummary?.id, consultation?.id, prescription?.id, draftTemplate?.consultation_id])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, createEmptyPrescriptionItem()] }))
  }

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const toggleSendChannel = (channel) => {
    setSendChannels((current) => current.includes(channel)
      ? current.filter((value) => value !== channel)
      : [...current, channel])
  }

  const runAction = async (mode, action) => {
    setActionMode(mode)
    setActionError(null)
    clearFeedback()
    setValidationError(null)

    try {
      await action()
      const labels = { create: 'Prescription draft created.', issue: 'Prescription issued successfully.', void: 'Prescription voided.', send: 'Prescription send state updated.', pdf: 'Prescription PDF foundation loaded.' }
      showSuccess(labels[mode] || 'Prescription updated successfully.', 'Prescription updated')
    } catch (nextError) {
      setActionError(nextError)
    } finally {
      setActionMode(null)
    }
  }

  const handleCreate = () => runAction('create', async () => {
    if (!form.patient_id || !form.consultation_id || !form.doctor_id) {
      setValidationError('Open this screen from a live consultation workspace before creating a prescription.')
      return
    }

    if (!(form.items || []).some((item) => item.medicine_name?.trim())) {
      setValidationError('Add at least one medicine before saving the prescription draft.')
      return
    }

    await onCreatePrescription?.(form)
  })

  const handleIssue = () => runAction('issue', async () => {
    await onIssuePrescription?.()
  })

  const handleVoid = () => runAction('void', async () => {
    if (!voidReason.trim()) {
      setValidationError('Void reason is required before voiding a prescription.')
      return
    }

    await onVoidPrescription?.({ void_reason: voidReason.trim() })
  })

  const handleSend = () => runAction('send', async () => {
    if (!sendChannels.length) {
      setValidationError('Select at least one send channel.')
      return
    }

    await onSendPrescription?.({
      send_channels: sendChannels,
      send_notes: sendNotes,
    })
  })

  const handlePdfFoundation = () => runAction('pdf', async () => {
    await onLoadPdfFoundation?.()
  })

  return (
    <AsyncContent
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!patientSummary}
      emptyTitle="Open from consultation workspace"
      emptyMessage="Prescription creation needs a live patient and consultation context. Start from doctor patient hub or consultation workspace."
    >
      <div>
        <PH
          title={`Prescription - ${patientSummary?.name || prescription?.patientSummary?.fullName || 'Patient'}`}
          icon="prescription"
          sub={`${patientSummary?.patientCode || prescription?.patientSummary?.patientCode || '--'} • ${prescription?.issueStatusLabel || 'Draft Builder'}${consultationSummary?.statusLabel ? ` • Consultation ${consultationSummary.statusLabel}` : ''}`}
          actions={(
            <>
              <button style={S.btn('ghost', true)} onClick={onOpenConsultation}>Back to Consultation</button>
              <button style={S.btn('outline', true)} onClick={() => goTo('patient-hub')}>Patient Hub</button>
            </>
          )}
        />

        <div style={{ background: `linear-gradient(135deg,${C.m},${C.mB})`, borderRadius: 10, padding: '12px 16px', color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 11 }}>
          <Av i={patientSummary?.avatarInitials || patient?.summary?.avatarInitials} idx={patientSummary?.avatarIndex || patient?.summary?.avatarIndex || 0} sz={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700 }}>{patientSummary?.name || prescription?.patientSummary?.fullName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
              {patientSummary?.patientCode || prescription?.patientSummary?.patientCode} • {patientSummary?.ageLabel || patient?.summary?.ageLabel || '--'} • {patientSummary?.phone || prescription?.patientSummary?.phone || '--'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Bdg type={prescription?.voidStatus ? 'critical' : prescription?.isIssued ? 'done' : 'wait'}>{prescription?.voidStatus ? 'Voided' : prescription?.issueStatusLabel || 'Draft'}</Bdg>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{prescription?.sentAtLabel || prescription?.issuedAtLabel || 'Not issued yet'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <SectionCard title={isExistingPrescription ? 'Prescription Detail' : 'Rx Builder'} right={isExistingPrescription ? <Bdg type="normal" sm>{prescription?.sendStatusLabel}</Bdg> : null}>
              {isExistingPrescription ? (
                <div style={{ background: C.bg, borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12, color: C.kB }}>
                  Draft creation is complete. The current backend flow supports detail, issue, void, PDF foundation, and send actions here. Item editing is not exposed by a backend update route in this batch.
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Prescription Date</label>
                  <Inp type="date" value={form.prescription_date} onChange={(event) => updateField('prescription_date', event.target.value)} disabled={isExistingPrescription} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Consultation</label>
                  <div style={{ ...S.inp, background: C.bg }}>{consultationSummary?.chiefComplaint || prescription?.consultationSummary?.chiefComplaint || '--'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Diagnosis Summary</label>
                  <TA value={form.diagnosis_summary} onChange={(event) => updateField('diagnosis_summary', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Advice Notes</label>
                  <TA value={form.advice_notes} onChange={(event) => updateField('advice_notes', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>General Instructions</label>
                  <TA value={form.general_instructions} onChange={(event) => updateField('general_instructions', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr 1.6fr 24px', gap: 5, marginBottom: 7 }}>
                {['Medicine', 'Strength', 'Dose', 'Frequency', 'Duration', 'Instructions', ''].map((heading, index) => (
                  <div key={index} style={{ fontSize: 9, fontWeight: 700, color: C.kS, textTransform: 'uppercase' }}>{heading}</div>
                ))}
              </div>

              {(form.items || []).map((item, index) => (
                <div key={`${index}-${item.medicine_name || 'rx'}`} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr 1.6fr 24px', gap: 5, alignItems: 'center' }}>
                    <input value={item.medicine_name} onChange={(event) => updateItem(index, 'medicine_name', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="Medicine name" />
                    <input value={item.strength} onChange={(event) => updateItem(index, 'strength', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="500 mg" />
                    <input value={item.dose} onChange={(event) => updateItem(index, 'dose', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="1 tab" />
                    <select value={item.frequency} onChange={(event) => updateItem(index, 'frequency', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }}>
                      {FREQUENCY_OPTIONS.map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      <input value={item.duration_value} onChange={(event) => updateItem(index, 'duration_value', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="7" />
                      <select value={item.duration_unit} onChange={(event) => updateItem(index, 'duration_unit', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }}>
                        {DURATION_OPTIONS.map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}
                      </select>
                    </div>
                    <input value={item.instructions} onChange={(event) => updateItem(index, 'instructions', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="After meals" />
                    <button type="button" onClick={() => removeItem(index)} disabled={isExistingPrescription || (form.items || []).length === 1} style={{ background: C.erL, color: C.er, border: 'none', width: 24, height: 24, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr 1.2fr 1fr 1fr 1fr', gap: 5, marginTop: 6 }}>
                    <input value={item.generic_name} onChange={(event) => updateItem(index, 'generic_name', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="Generic name" />
                    <select value={item.route} onChange={(event) => updateItem(index, 'route', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }}>
                      {ROUTE_OPTIONS.map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}
                    </select>
                    <input value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="Qty" />
                    <input value={item.formulation} onChange={(event) => updateItem(index, 'formulation', event.target.value)} disabled={isExistingPrescription} style={{ ...S.inp, fontSize: 12 }} placeholder="Tablet / Syrup" />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.kB }}><input type="checkbox" checked={item.before_food} onChange={(event) => updateItem(index, 'before_food', event.target.checked)} disabled={isExistingPrescription} />Before food</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.kB }}><input type="checkbox" checked={item.after_food} onChange={(event) => updateItem(index, 'after_food', event.target.checked)} disabled={isExistingPrescription} />After food</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.kB }}><input type="checkbox" checked={item.is_prn} onChange={(event) => updateItem(index, 'is_prn', event.target.checked)} disabled={isExistingPrescription} />PRN</label>
                  </div>
                </div>
              ))}

              {!isExistingPrescription ? (
                <button type="button" style={{ ...S.btn('ghost', true), marginTop: 5 }} onClick={addItem}>+ Add Medicine</button>
              ) : null}

              {validationError ? <div style={{ background: C.wnL, color: C.wn, borderRadius: 10, padding: 10, fontSize: 12, marginTop: 12 }}>{validationError}</div> : null}
              {feedback ? <div style={{ marginTop: 12 }}><FeedbackBar tone={feedback.tone} title={feedback.title} message={feedback.message} compact onDismiss={clearFeedback} /></div> : null}
              {actionError ? <div style={{ marginTop: 12 }}><FeedbackBar tone="error" title="Prescription action failed" message={actionError.message || 'Prescription action failed.'} compact onDismiss={() => setActionError(null)} /></div> : null}

              {!isExistingPrescription ? (
                <FormActions>
                  <LoadingButton label="Create Prescription Draft" loadingLabel="Creating..." loading={actionMode === 'create'} onClick={handleCreate} />
                </FormActions>
              ) : null}
            </SectionCard>

            <SectionCard title="Prescription Actions" right={isExistingPrescription ? <Bdg type={prescription?.isSent ? 'done' : 'wait'} sm>{prescription?.sendStatusLabel}</Bdg> : null}>
              {isExistingPrescription ? (
                <>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12 }}>
                      <strong>Issue:</strong> {prescription?.issueStatusLabel} {prescription?.issuedAtLabel ? `• ${prescription.issuedAtLabel}` : ''}
                    </div>
                    <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12 }}>
                      <strong>Send:</strong> {prescription?.sendStatusLabel} {prescription?.sendChannelsLabel && prescription?.sendChannels?.length ? `• ${prescription.sendChannelsLabel}` : ''}
                    </div>
                    {prescription?.voidStatus ? (
                      <div style={{ background: C.erL, color: C.er, borderRadius: 10, padding: 10, fontSize: 12 }}>
                        <strong>Void reason:</strong> {prescription?.voidReason || 'Not recorded'}
                      </div>
                    ) : null}
                  </div>

                  {!prescription?.isIssued && !prescription?.voidStatus ? (
                    <LoadingButton label="Issue Prescription" loadingLabel="Issuing..." variant="ok" loading={actionMode === 'issue'} onClick={handleIssue} />
                  ) : null}

                  {!prescription?.voidStatus ? (
                    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Void Reason</label>
                        <TA value={voidReason} onChange={(event) => setVoidReason(event.target.value)} style={{ ...S.inp, minHeight: 70, resize: 'vertical' }} placeholder="Why is this prescription being voided?" />
                      </div>
                      <LoadingButton label="Void Prescription" loadingLabel="Voiding..." variant="danger" loading={actionMode === 'void'} onClick={handleVoid} />
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Send Channels</label>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                        {SEND_CHANNEL_OPTIONS.map((channel) => (
                          <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.kB }}>
                            <input type="checkbox" checked={sendChannels.includes(channel)} onChange={() => toggleSendChannel(channel)} disabled={prescription?.voidStatus} />
                            {channel.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Send Notes</label>
                      <TA value={sendNotes} onChange={(event) => setSendNotes(event.target.value)} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} placeholder="Optional note for send history" disabled={prescription?.voidStatus} />
                    </div>
                    <FormActions>
                      <LoadingButton label="Load PDF Foundation" loadingLabel="Loading..." variant="outline" loading={actionMode === 'pdf'} onClick={handlePdfFoundation} disabled={!prescription?.pdfAvailable} />
                      <LoadingButton label="Send Prescription" loadingLabel="Sending..." variant="teal" loading={actionMode === 'send'} onClick={handleSend} disabled={!prescription?.isIssued || prescription?.voidStatus} />
                    </FormActions>
                    <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12, color: C.kS }}>
                      PDF endpoint honesty: this backend returns a JSON foundation payload, not a binary file download in this batch.
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState title="Create the prescription first" message="Issue, void, PDF foundation, and send actions unlock after the prescription draft is created." compact />
              )}
            </SectionCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <SectionCard title="Prescription Preview">
              <div style={{ border: `1.5px solid ${C.bd}`, borderRadius: 8, padding: 14, fontSize: 12, background: C.bg }}>
                <div style={{ textAlign: 'center', borderBottom: `2px solid ${C.bd}`, paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: C.m }}>Jijau Hospital</div>
                  <div style={{ fontSize: 11, color: C.kS }}>{consultation?.doctorSummary?.fullName || prescription?.doctorSummary?.fullName || 'Doctor'} • {prescription?.doctorSummary?.registrationNumber || consultation?.doctorSummary?.speciality || 'Gynecology'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8, fontSize: 11 }}>
                  <div><strong>Patient:</strong> {patientSummary?.name || prescription?.patientSummary?.fullName || '—'}</div>
                  <div><strong>Date:</strong> {prescription?.prescriptionDateLabel || form.prescription_date || '—'}</div>
                  <div><strong>Consultation:</strong> {consultationSummary?.statusLabel || prescription?.consultationSummary?.statusLabel || '--'}</div>
                  <div><strong>Status:</strong> {prescription?.issueStatusLabel || 'Draft'}</div>
                </div>
                {form.diagnosis_summary ? <div style={{ marginBottom: 8, fontSize: 11 }}><strong>Diagnosis:</strong> {form.diagnosis_summary}</div> : null}
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 17, color: C.m, marginBottom: 7 }}>Rx</div>
                {previewItems.length ? previewItems.map((item, index) => (
                  <div key={item.key || index} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${C.bd}`, fontSize: 11 }}>
                    <div>{index + 1}. <strong>{item.medicineName}</strong>{item.strength ? ` (${item.strength})` : ''} - {item.dose}, {item.frequency}, {item.durationLabel}</div>
                    <div style={{ color: C.kS, marginTop: 2, paddingLeft: 12 }}>{item.route} • {item.instructions || 'No instructions'} • {item.statusLabel}</div>
                  </div>
                )) : <EmptyState title="No medicines yet" message="Add medicine rows to preview the prescription." compact />}
                {form.general_instructions ? (
                  <div style={{ background: C.mP, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 11 }}>
                    <strong>Instructions:</strong> {form.general_instructions}
                  </div>
                ) : null}
                <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 7, fontSize: 11, textAlign: 'right', marginTop: 7 }}>
                  <div style={{ fontWeight: 700, color: C.m }}>{consultation?.doctorSummary?.fullName || prescription?.doctorSummary?.fullName || 'Doctor'}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="PDF Foundation Response">
              {pdfFoundation ? (
                <div style={{ display: 'grid', gap: 9 }}>
                  <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12 }}><strong>Filename:</strong> {pdfFoundation.filename}</div>
                  <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12 }}><strong>Content Type:</strong> {pdfFoundation.contentType}</div>
                  <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12 }}><strong>Foundation Type:</strong> {pdfFoundation.foundationType}</div>
                  <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12, color: C.kS }}>
                    This is backend foundation JSON for PDF generation. Binary PDF download is not exposed by this endpoint in the current backend contract.
                  </div>
                </div>
              ) : (
                <EmptyState title="No PDF payload loaded" message="Use “Load PDF Foundation” after issuing the prescription to inspect the backend PDF foundation response." compact />
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </AsyncContent>
  )
}
