import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Av, Bdg, Inp, PH, Sel, TA, TL } from '../atoms.jsx'
import { AsyncContent, EmptyState } from '../../modules/shared/ui/state/index.js'
import { FormActions, LoadingButton } from '../../modules/shared/ui/form/index.js'
import { SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import {
  BACKEND_PATIENT_CATEGORY_TO_TEMPLATE,
  PATIENT_CATEGORY_LABELS,
  PATIENT_CATEGORY_VALUES,
} from '../../modules/shared/enums/patient.enums.js'
import { createEmptyConsultationForm } from '../../modules/consultations/consultations.adapters.js'

const CATEGORY_OPTIONS = [
  PATIENT_CATEGORY_VALUES.PREGNANCY,
  PATIENT_CATEGORY_VALUES.IVF,
  PATIENT_CATEGORY_VALUES.GYNAC,
  PATIENT_CATEGORY_VALUES.UNCATEGORIZED,
]

function getCategoryTone(value) {
  const key = BACKEND_PATIENT_CATEGORY_TO_TEMPLATE[value]

  if (key === 'Pregnancy') {
    return { background: C.tP, border: `1.5px solid ${C.tL}`, color: C.t }
  }

  if (key === 'Infertility') {
    return { background: '#F9F5FE', border: `1.5px solid #EDE0F8`, color: '#6B35A0' }
  }

  if (key === 'Gynac') {
    return { background: C.mP, border: `1.5px solid ${C.mL}`, color: C.m }
  }

  return { background: C.bg, border: `1.5px solid ${C.bd}`, color: C.kB }
}

function buildInitialState({ consultation, workspace, draftTemplate, patient }) {
  const source = consultation?.form || workspace?.editableSections || draftTemplate || createEmptyConsultationForm({
    patientId: patient?.summary?.id || null,
  })

  return {
    form: {
      ...createEmptyConsultationForm({ patientId: patient?.summary?.id || null }),
      ...source,
      vitals: {
        ...createEmptyConsultationForm().vitals,
        ...(source.vitals || {}),
      },
      examination: {
        ...createEmptyConsultationForm().examination,
        ...(source.examination || {}),
      },
      diagnosis: {
        ...createEmptyConsultationForm().diagnosis,
        ...(source.diagnosis || {}),
      },
    },
    categoryValue: patient?.summary?.category || PATIENT_CATEGORY_VALUES.UNCATEGORIZED,
    categoryReason: '',
    followUp: {
      follow_up_required: consultation?.form?.follow_up_required
        || workspace?.editableSections?.follow_up_required
        || Boolean(consultation?.followUpSummary || workspace?.followUpSummary),
      follow_up_date: consultation?.form?.follow_up_date
        || workspace?.editableSections?.follow_up_date
        || '',
      follow_up_reason: consultation?.followUpSummary?.reason || workspace?.followUpSummary?.reason || '',
      follow_up_notes: consultation?.followUpSummary?.notes || workspace?.followUpSummary?.notes || '',
      follow_up_priority: consultation?.followUpSummary?.priority || workspace?.followUpSummary?.priority || 'normal',
    },
  }
}

export default function Consult({
  patient,
  patientHub,
  categoryHistory,
  consultation,
  workspace,
  followUp,
  draftTemplate,
  hasConsultationId,
  isLoading,
  error,
  onRetry,
  onSaveDraft,
  onUpdateStatus,
  onFinalise,
  onOpenPregnancyTracker,
  onOpenPrescriptionBuilder,
  onOpenTestReports,
  goTo,
}) {
  const [form, setForm] = useState(createEmptyConsultationForm())
  const [categoryValue, setCategoryValue] = useState(PATIENT_CATEGORY_VALUES.UNCATEGORIZED)
  const [categoryReason, setCategoryReason] = useState('')
  const [followUpState, setFollowUpState] = useState({
    follow_up_required: false,
    follow_up_date: '',
    follow_up_reason: '',
    follow_up_notes: '',
    follow_up_priority: 'normal',
  })
  const [actionError, setActionError] = useState(null)
  const { feedback, showSuccess, clearFeedback } = useFeedbackState()
  const [actionMode, setActionMode] = useState(null)
  const [localConsultationId, setLocalConsultationId] = useState(hasConsultationId)

  const patientSummary = patient?.summary || null
  const consultationStatusLabel = workspace?.consultation?.statusLabel || consultation?.statusLabel || 'Draft'
  const latestCategoryEvents = categoryHistory?.slice(0, 3) || []
  const recentAppointments = patientHub?.recentAppointments || []
  const latestFollowUp = followUp || consultation?.followUpSummary || workspace?.followUpSummary || null

  useEffect(() => {
    const initialState = buildInitialState({ consultation, workspace, draftTemplate, patient })
    setForm(initialState.form)
    setCategoryValue(initialState.categoryValue)
    setCategoryReason(initialState.categoryReason)
    setFollowUpState(initialState.followUp)
    setActionError(null)
    clearFeedback()
    setActionMode(null)
    setLocalConsultationId(hasConsultationId)
  }, [consultation?.id, patientSummary?.id, workspace?.consultation?.id, hasConsultationId])

  const handleFormChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleNestedChange = (group, field, value) => {
    setForm((current) => ({
      ...current,
      [group]: {
        ...(current[group] || {}),
        [field]: value,
      },
    }))
  }

  const handleFollowUpChange = (field, value) => {
    setFollowUpState((current) => ({ ...current, [field]: value }))
  }

  const validateFollowUp = () => {
    if (followUpState.follow_up_required && !followUpState.follow_up_date) {
      const validationError = new Error('Follow-up date is required before finalising consultation.')
      validationError.status = 400
      throw validationError
    }
  }

  const performAction = async (mode, action) => {
    setActionMode(mode)
    setActionError(null)
    clearFeedback()

    try {
      const maybeConsultationId = await action()
      if (maybeConsultationId) {
        setLocalConsultationId(true)
      }
      const labels = { save: 'Consultation draft saved.', 'in-progress': 'Consultation marked in progress.', completed: 'Consultation marked completed.', finalise: 'Consultation finalised successfully.' }
      showSuccess(labels[mode] || 'Consultation updated successfully.', 'Consultation updated')
    } catch (nextError) {
      setActionError(nextError)
    } finally {
      setActionMode(null)
    }
  }

  const snapshotRows = useMemo(() => [
    { label: 'Chief Complaint', value: form.chief_complaint || '--' },
    { label: 'History', value: form.history_of_present_illness || '--' },
    { label: 'Primary Diagnosis', value: form.diagnosis.primary || '--' },
    { label: 'Advice', value: form.advice || '--' },
  ], [form])

  return (
    <AsyncContent
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!patientSummary}
      emptyTitle="Select a patient first"
      emptyMessage="Open a patient from the doctor patient hub before entering the follow-up consultation workspace."
    >
      <div>
        <PH
          title={`Consultation Workspace - ${patientSummary?.name || 'Patient'}`}
          icon="followUp"
          sub={`${patientSummary?.patientCode || '--'} • ${consultationStatusLabel}${workspace?.appointmentSummary?.visitTypeLabel ? ` • ${workspace.appointmentSummary.visitTypeLabel}` : ''}`}
          actions={(
            <>
              <button style={S.btn('ghost', true)} onClick={() => goTo('patient-hub')}>Back to Patient Hub</button>
              <button style={S.btn('outline', true)} onClick={() => goTo('doc-dash')}>Dashboard</button>
            </>
          )}
        />

        <div style={{ background: `linear-gradient(135deg,${C.m},${C.mB})`, borderRadius: 10, padding: '12px 16px', color: '#fff', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 11 }}>
          <Av i={patientSummary?.avatarInitials} idx={patientSummary?.avatarIndex || 0} sz={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700 }}>{patientSummary?.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>{patientSummary?.patientCode} • {patientSummary?.ageLabel} • {patientSummary?.phone}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Bdg type={consultation?.status === 'finalised' ? 'done' : consultation?.status === 'completed' ? 'normal' : 'wait'}>{consultationStatusLabel}</Bdg>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{workspace?.consultation?.finalisedAtLabel || consultation?.finalisedAtLabel || 'Draft in progress'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <SectionCard title="Today's Vitals">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Blood Pressure</label>
                  <Inp value={form.vitals.blood_pressure} onChange={(event) => handleNestedChange('vitals', 'blood_pressure', event.target.value)} placeholder="120/80" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Weight (kg)</label>
                  <Inp value={form.vitals.weight_kg} onChange={(event) => handleNestedChange('vitals', 'weight_kg', event.target.value)} placeholder="62" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Height (cm)</label>
                  <Inp value={form.vitals.height_cm} onChange={(event) => handleNestedChange('vitals', 'height_cm', event.target.value)} placeholder="155" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Pulse</label>
                  <Inp value={form.vitals.pulse} onChange={(event) => handleNestedChange('vitals', 'pulse', event.target.value)} placeholder="78" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Temperature (°C)</label>
                  <Inp value={form.vitals.temperature_c} onChange={(event) => handleNestedChange('vitals', 'temperature_c', event.target.value)} placeholder="37" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>SpO2 (%)</label>
                  <Inp value={form.vitals.spo2} onChange={(event) => handleNestedChange('vitals', 'spo2', event.target.value)} placeholder="98" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Notes and Diagnosis">
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Chief Complaint</label>
                  <Inp value={form.chief_complaint} onChange={(event) => handleFormChange('chief_complaint', event.target.value)} placeholder="Primary clinical concern" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>History of Present Illness</label>
                  <TA value={form.history_of_present_illness} onChange={(event) => handleFormChange('history_of_present_illness', event.target.value)} style={{ ...S.inp, minHeight: 80, resize: 'vertical' }} placeholder="Clinical course since last visit" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Inp value={form.diagnosis.primary} onChange={(event) => handleNestedChange('diagnosis', 'primary', event.target.value)} placeholder="Primary diagnosis" />
                  <Inp value={form.provisional_diagnosis} onChange={(event) => handleFormChange('provisional_diagnosis', event.target.value)} placeholder="Provisional diagnosis" />
                </div>
                <Inp value={form.diagnosis.secondary_text} onChange={(event) => handleNestedChange('diagnosis', 'secondary_text', event.target.value)} placeholder="Secondary diagnoses (comma separated)" />
                <TA value={form.diagnosis.notes} onChange={(event) => handleNestedChange('diagnosis', 'notes', event.target.value)} style={{ ...S.inp, minHeight: 70, resize: 'vertical' }} placeholder="Diagnosis notes" />
                <TA value={form.advice} onChange={(event) => handleFormChange('advice', event.target.value)} style={{ ...S.inp, minHeight: 80, resize: 'vertical' }} placeholder="Treatment plan, advice, investigations" />
                <TA value={form.notes} onChange={(event) => handleFormChange('notes', event.target.value)} style={{ ...S.inp, minHeight: 80, resize: 'vertical' }} placeholder="Doctor notes for the chart" />
              </div>
            </SectionCard>

            <SectionCard title="Actions">
              <div style={{ display: 'grid', gap: 10 }}>
                {feedback ? <FeedbackBar tone={feedback.tone} title={feedback.title} message={feedback.message} compact onDismiss={clearFeedback} /> : null}
                {actionError ? <FeedbackBar tone="error" title="Consultation action failed" message={actionError.message || 'Consultation action failed.'} compact onDismiss={() => setActionError(null)} /> : null}
                {!localConsultationId ? (
                  <div style={{ background: C.wnL, color: C.wn, borderRadius: 10, padding: 10, fontSize: 12 }}>
                    Save a consultation draft first to unlock status updates and finalisation.
                  </div>
                ) : null}
                <FormActions>
                  <LoadingButton label="Save Draft" loadingLabel="Saving Draft..." loading={actionMode === 'save'} onClick={() => performAction('save', () => onSaveDraft({ form, category: { value: categoryValue, reason: categoryReason } }))} />
                  <LoadingButton label="Mark In Progress" loadingLabel="Updating..." variant="outline" loading={actionMode === 'in-progress'} onClick={() => performAction('in-progress', () => onUpdateStatus({ form, status: 'in_progress', category: { value: categoryValue, reason: categoryReason } }))} disabled={!localConsultationId} />
                  <LoadingButton label="Mark Completed" loadingLabel="Updating..." variant="teal" loading={actionMode === 'completed'} onClick={() => performAction('completed', () => onUpdateStatus({ form, status: 'completed', category: { value: categoryValue, reason: categoryReason } }))} disabled={!localConsultationId} />
                  <LoadingButton label="Finalise Consultation" loadingLabel="Finalising..." variant="ok" loading={actionMode === 'finalise'} onClick={() => performAction('finalise', async () => {
                    validateFollowUp()
                    return onFinalise({
                      form,
                      category: { value: categoryValue, reason: categoryReason },
                      followUp: followUpState,
                    })
                  })} disabled={!localConsultationId} />
                  {categoryValue === PATIENT_CATEGORY_VALUES.PREGNANCY ? (
                    <button type="button" style={S.btn('outline')} onClick={() => onOpenPregnancyTracker?.(patientSummary?.id)}>Pregnancy Tracker</button>
                  ) : null}
                  <button type="button" style={S.btn('purple')} onClick={() => onOpenTestReports ? onOpenTestReports(patientSummary?.id, consultation?.id || workspace?.consultation?.id) : goTo('test-reports')}>Tests</button>
                  <button
                    type="button"
                    style={S.btn('teal')}
                    onClick={() => onOpenPrescriptionBuilder?.(patientSummary?.id, consultation?.id || workspace?.consultation?.id)}
                  >
                    Prescription
                  </button>
                </FormActions>
              </div>
            </SectionCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <SectionCard title="Patient Category" right={<Bdg type="normal" sm>{PATIENT_CATEGORY_LABELS[categoryValue]}</Bdg>}>
              <div style={{ ...getCategoryTone(categoryValue), borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Current working category</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Category updates are saved using the patient category endpoint and recorded in history.
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Category</label>
                  <Sel
                    opts={CATEGORY_OPTIONS.map((value) => ({ v: value, l: PATIENT_CATEGORY_LABELS[value] }))}
                    value={categoryValue}
                    onChange={(event) => setCategoryValue(event.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Change reason</label>
                  <TA value={categoryReason} onChange={(event) => setCategoryReason(event.target.value)} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} placeholder="Reason for category change, if any" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Follow-up Planning" right={latestFollowUp ? <Bdg type="wait" sm>{latestFollowUp.statusLabel}</Bdg> : null}>
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={followUpState.follow_up_required} onChange={(event) => handleFollowUpChange('follow_up_required', event.target.checked)} />
                  Follow-up required
                </label>
                <Inp type="date" value={followUpState.follow_up_date} onChange={(event) => handleFollowUpChange('follow_up_date', event.target.value)} />
                <Sel
                  opts={[
                    { v: 'normal', l: 'Normal priority' },
                    { v: 'high', l: 'High priority' },
                    { v: 'urgent', l: 'Urgent priority' },
                    { v: 'low', l: 'Low priority' },
                  ]}
                  value={followUpState.follow_up_priority}
                  onChange={(event) => handleFollowUpChange('follow_up_priority', event.target.value)}
                />
                <TA value={followUpState.follow_up_reason} onChange={(event) => handleFollowUpChange('follow_up_reason', event.target.value)} style={{ ...S.inp, minHeight: 64, resize: 'vertical' }} placeholder="Follow-up reason" />
                <TA value={followUpState.follow_up_notes} onChange={(event) => handleFollowUpChange('follow_up_notes', event.target.value)} style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} placeholder="Follow-up notes" />
                {latestFollowUp ? (
                  <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12, color: C.kB }}>
                    <div><strong>Current follow-up:</strong> {latestFollowUp.dueDateLabel || '--'} • {latestFollowUp.priorityLabel}</div>
                    {latestFollowUp.reason ? <div style={{ marginTop: 4 }}>{latestFollowUp.reason}</div> : null}
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Recent Appointments">
              {recentAppointments.length ? (
                <TL items={recentAppointments.map((appointment) => ({
                  title: `${appointment.visitTypeLabel} • ${appointment.statusLabel}`,
                  sub: `${appointment.scheduledAtLabel}${appointment.reason ? ` • ${appointment.reason}` : ''}`,
                  color: C.m,
                }))} />
              ) : (
                <EmptyState title="No recent appointments" message="Appointment history for this patient is not available yet." compact />
              )}
            </SectionCard>

            <SectionCard title="Category Timeline">
              {latestCategoryEvents.length ? (
                <TL items={latestCategoryEvents.map((entry) => ({
                  title: `${entry.previousCategoryLabel} → ${entry.nextCategoryLabel}`,
                  sub: `${entry.changedAtLabel}${entry.reason ? ` • ${entry.reason}` : ''}`,
                  color: C.m,
                }))} />
              ) : (
                <EmptyState title="No category history yet" message="Category changes will appear here after the doctor updates patient category." compact />
              )}
            </SectionCard>

            <SectionCard title="Consultation Snapshot">
              <div style={{ display: 'grid', gap: 8 }}>
                {snapshotRows.map((row) => (
                  <div key={row.label} style={{ background: C.bg, borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 11, color: C.kS, textTransform: 'uppercase', fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: C.kB, marginTop: 4, whiteSpace: 'pre-wrap' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AsyncContent>
  )
}
