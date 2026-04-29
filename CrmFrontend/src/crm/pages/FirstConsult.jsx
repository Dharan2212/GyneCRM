import { useEffect, useMemo, useState } from 'react'
import { C, CAT } from '../data.js'
import { S } from '../styles.js'
import { Av, Bdg, Inp, PH, Sel, TA, TL } from '../atoms.jsx'
import { AsyncContent, EmptyState } from '../../modules/shared/ui/state/index.js'
import { FormActions, LoadingButton } from '../../modules/shared/ui/form/index.js'
import { SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar } from '../../modules/shared/ui/feedback/index.js'
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
]

function buildTemplateCategory(value) {
  return BACKEND_PATIENT_CATEGORY_TO_TEMPLATE[value] || 'Gynac'
}

function getCategoryMeta(value) {
  return CAT[buildTemplateCategory(value)] || CAT.Gynac
}

function createInitialState(patient) {
  return {
    form: createEmptyConsultationForm({
      patientId: patient?.summary?.id || null,
    }),
    categoryValue: patient?.summary?.category || '',
    categoryReason: '',
  }
}

export default function FirstConsult({
  patient,
  categoryHistory,
  isLoading,
  error,
  onRetry,
  onCreateConsultation,
  goTo,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(createEmptyConsultationForm())
  const [categoryValue, setCategoryValue] = useState('')
  const [categoryReason, setCategoryReason] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const patientSummary = patient?.summary || null
  const latestCategoryEvents = categoryHistory?.slice(0, 3) || []

  useEffect(() => {
    if (!patientSummary?.id) {
      setForm(createEmptyConsultationForm())
      setCategoryValue('')
      setCategoryReason('')
      return
    }

    const initialState = createInitialState(patient)
    setForm(initialState.form)
    setCategoryValue(initialState.categoryValue)
    setCategoryReason(initialState.categoryReason)
    setStep(1)
    setSubmitError(null)
    setValidationErrors({})
  }, [patientSummary?.id])

  const summaryRows = useMemo(() => [
    { label: 'Chief Complaint', value: form.chief_complaint || '--' },
    { label: 'History', value: form.history_of_present_illness || '--' },
    { label: 'Vitals', value: [form.vitals.blood_pressure, form.vitals.weight_kg ? `${form.vitals.weight_kg} kg` : null, form.vitals.pulse ? `${form.vitals.pulse} bpm` : null].filter(Boolean).join(' • ') || '--' },
    { label: 'Category', value: PATIENT_CATEGORY_LABELS[categoryValue] || '--' },
  ], [categoryValue, form])

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

  const validateBeforeSubmit = () => {
    const nextErrors = {}

    if (!form.chief_complaint?.trim()) {
      nextErrors.chief_complaint = 'Chief complaint is required.'
    }

    if (!categoryValue) {
      nextErrors.categoryValue = 'Select a patient category.'
    }

    if (form.follow_up_required && !form.follow_up_date) {
      nextErrors.follow_up_date = 'Follow-up date is required when follow-up is checked.'
    }

    setValidationErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) {
      setStep(4)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onCreateConsultation({
        form,
        category: {
          value: categoryValue,
          reason: categoryReason,
        },
      })
    } catch (submissionError) {
      setSubmitError(submissionError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AsyncContent
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!patientSummary}
      emptyTitle="Select a patient first"
      emptyMessage="Open a patient from the doctor patient hub before starting the first consultation workflow."
    >
      <div>
        <PH
          title={`First Consultation - ${patientSummary?.name || 'Patient'}`}
          icon="firstConsult"
          sub={`${patientSummary?.patientCode || '--'} • ${patientSummary?.ageLabel || '--'} • ${patientSummary?.phone || '--'}`}
          actions={(
            <>
              <button style={S.btn('ghost', true)} onClick={() => goTo('patient-hub')}>Back to Patient Hub</button>
              <button style={S.btn('outline', true)} onClick={() => goTo('doc-dash')}>Dashboard</button>
            </>
          )}
        />

        <div style={{ background: `linear-gradient(135deg,${C.m},${C.mB})`, borderRadius: 10, padding: '12px 16px', color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 11 }}>
          <Av i={patientSummary?.avatarInitials} idx={patientSummary?.avatarIndex || 0} sz={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700 }}>{patientSummary?.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
              {patientSummary?.patientCode} • {patientSummary?.ageLabel} • {patientSummary?.phone}
            </div>
          </div>
          <Bdg type={patientSummary?.activeBadgeType || 'done'}>{patientSummary?.activeLabel || 'Active'}</Bdg>
        </div>

        <div style={{ display: 'flex', marginBottom: 16, background: C.bd, borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
          {[
            { id: 1, label: '1. History' },
            { id: 2, label: '2. Vitals' },
            { id: 3, label: '3. Category' },
            { id: 4, label: '4. Save' },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setStep(item.id)}
              style={{
                padding: '9px 18px',
                cursor: 'pointer',
                background: step === item.id ? C.m : 'transparent',
                color: step === item.id ? '#fff' : C.kS,
                fontWeight: step === item.id ? 700 : 400,
                fontSize: 12,
                transition: 'all .2s',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <SectionCard title="Clinical History">
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Chief Complaint</label>
                  <TA value={form.chief_complaint} onChange={(event) => handleFormChange('chief_complaint', event.target.value)} placeholder="Detailed presenting complaint..." />
                  {validationErrors.chief_complaint ? <div style={{ fontSize: 11, color: C.er }}>{validationErrors.chief_complaint}</div> : null}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>History of Present Illness</label>
                  <TA value={form.history_of_present_illness} onChange={(event) => handleFormChange('history_of_present_illness', event.target.value)} placeholder="Symptoms, menstrual / obstetric history, previous treatment..." style={{ ...S.inp, minHeight: 100, resize: 'vertical' }} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Patient Context">
              <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
                <div><strong>Blood Group:</strong> {patientSummary?.bloodGroup || '--'}</div>
                <div><strong>Family WhatsApp:</strong> {patient?.familyWhatsapp || '--'}</div>
                <div><strong>Address:</strong> {patient?.addressLabel || '--'}</div>
                <div><strong>Emergency:</strong> {patient?.emergencyContactLabel || '--'}</div>
              </div>
              {patient?.medicalHistoryNotes?.length ? (
                <div style={{ marginTop: 12, background: C.bg, borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.kB, marginBottom: 6 }}>Medical History</div>
                  <ul style={{ paddingLeft: 16, color: C.kB, fontSize: 12, lineHeight: 1.5 }}>
                    {patient.medicalHistoryNotes.map((entry) => <li key={entry}>{entry}</li>)}
                  </ul>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionCard title="Vitals">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Blood Pressure</label>
                  <Inp value={form.vitals.blood_pressure} onChange={(event) => handleNestedChange('vitals', 'blood_pressure', event.target.value)} placeholder="120/80" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Weight (kg)</label>
                  <Inp value={form.vitals.weight_kg} onChange={(event) => handleNestedChange('vitals', 'weight_kg', event.target.value)} placeholder="60" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Height (cm)</label>
                  <Inp value={form.vitals.height_cm} onChange={(event) => handleNestedChange('vitals', 'height_cm', event.target.value)} placeholder="155" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Pulse</label>
                  <Inp value={form.vitals.pulse} onChange={(event) => handleNestedChange('vitals', 'pulse', event.target.value)} placeholder="76" />
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

            <SectionCard title="Examination & Diagnosis">
              <div style={{ display: 'grid', gap: 10 }}>
                <TA value={form.examination.general_examination} onChange={(event) => handleNestedChange('examination', 'general_examination', event.target.value)} placeholder="General examination" style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} />
                <TA value={form.examination.abdominal_examination} onChange={(event) => handleNestedChange('examination', 'abdominal_examination', event.target.value)} placeholder="Abdominal examination" style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} />
                <TA value={form.examination.pelvic_examination} onChange={(event) => handleNestedChange('examination', 'pelvic_examination', event.target.value)} placeholder="Pelvic examination" style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} />
                <Inp value={form.diagnosis.primary} onChange={(event) => handleNestedChange('diagnosis', 'primary', event.target.value)} placeholder="Primary diagnosis" />
                <Inp value={form.diagnosis.secondary_text} onChange={(event) => handleNestedChange('diagnosis', 'secondary_text', event.target.value)} placeholder="Secondary diagnoses (comma separated)" />
                <TA value={form.diagnosis.notes} onChange={(event) => handleNestedChange('diagnosis', 'notes', event.target.value)} placeholder="Diagnosis notes" style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} />
              </div>
            </SectionCard>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16 }}>
            <SectionCard title="Doctor Category Decision" right={categoryValue ? <Bdg type="normal">{PATIENT_CATEGORY_LABELS[categoryValue]}</Bdg> : null}>
              <div style={{ ...S.card({ background: C.wnL, border: `1.5px solid ${C.wn}30`, boxShadow: 'none' }), marginBottom: 16, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.wn, marginBottom: 4 }}>Doctor category assignment</div>
                <div style={{ fontSize: 13, color: C.kB, lineHeight: 1.6 }}>
                  Category assignment is saved through the patient category API and recorded in category history.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {CATEGORY_OPTIONS.map((categoryOption) => {
                  const categoryMeta = getCategoryMeta(categoryOption)
                  return (
                    <button
                      key={categoryOption}
                      type="button"
                      onClick={() => setCategoryValue(categoryOption)}
                      style={{
                        border: `2px solid ${categoryValue === categoryOption ? categoryMeta.c : C.bd}`,
                        borderRadius: 12,
                        padding: 16,
                        cursor: 'pointer',
                        background: categoryValue === categoryOption ? categoryMeta.p : C.w,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontFamily: 'Georgia,serif', fontSize: 32, color: categoryMeta.c, marginBottom: 8 }}>{categoryMeta.icon}</div>
                      <div style={{ fontWeight: 700, color: categoryMeta.c }}>{PATIENT_CATEGORY_LABELS[categoryOption]}</div>
                    </button>
                  )
                })}
              </div>
              {validationErrors.categoryValue ? <div style={{ fontSize: 11, color: C.er, marginTop: 8 }}>{validationErrors.categoryValue}</div> : null}

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Category change reason</label>
                <TA value={categoryReason} onChange={(event) => setCategoryReason(event.target.value)} placeholder="Reason for category assignment or change" style={{ ...S.inp, minHeight: 68, resize: 'vertical' }} />
              </div>
            </SectionCard>

            <SectionCard title="Recent Category History">
              {latestCategoryEvents.length ? (
                <TL items={latestCategoryEvents.map((entry) => ({
                  title: `${entry.previousCategoryLabel} → ${entry.nextCategoryLabel}`,
                  sub: `${entry.changedAtLabel}${entry.reason ? ` • ${entry.reason}` : ''}`,
                  color: C.m,
                }))} />
              ) : (
                <EmptyState title="No category history yet" message="This patient has not had category changes recorded yet." compact />
              )}
            </SectionCard>
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }}>
            <SectionCard title="Consultation Review">
              <div style={{ display: 'grid', gap: 10 }}>
                {summaryRows.map((row) => (
                  <div key={row.label} style={{ background: C.bg, borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 11, color: C.kS, textTransform: 'uppercase', fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: C.kB, marginTop: 4, whiteSpace: 'pre-wrap' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Follow-up Planning">
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={form.follow_up_required} onChange={(event) => handleFormChange('follow_up_required', event.target.checked)} />
                  Follow-up required
                </label>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Follow-up date</label>
                  <Inp type="date" value={form.follow_up_date} onChange={(event) => handleFormChange('follow_up_date', event.target.value)} />
                  {validationErrors.follow_up_date ? <div style={{ fontSize: 11, color: C.er }}>{validationErrors.follow_up_date}</div> : null}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Advice / plan</label>
                  <TA value={form.advice} onChange={(event) => handleFormChange('advice', event.target.value)} placeholder="Immediate advice, investigations, and care plan" style={{ ...S.inp, minHeight: 90, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.kB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Consultation notes</label>
                  <TA value={form.notes} onChange={(event) => handleFormChange('notes', event.target.value)} placeholder="Notes for the chart" style={{ ...S.inp, minHeight: 90, resize: 'vertical' }} />
                </div>
                {submitError ? <FeedbackBar tone="error" title="Consultation could not be created" message={submitError.message || 'Consultation could not be created.'} compact onDismiss={() => setSubmitError(null)} /> : null}
                <FormActions>
                  <button type="button" style={S.btn('ghost')} onClick={() => setStep(3)}>Back</button>
                  <LoadingButton label="Create Consultation" loadingLabel="Creating Consultation..." loading={isSubmitting} onClick={handleSubmit} />
                </FormActions>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </AsyncContent>
  )
}
