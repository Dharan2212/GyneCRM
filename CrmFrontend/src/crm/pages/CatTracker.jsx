import { useEffect, useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { Av, Bdg, PH, SC } from '../atoms.jsx'
import { AsyncContent } from '../../modules/shared/ui/state/index.js'
import { FormActions, LoadingButton, TextAreaField, TextField, SelectField } from '../../modules/shared/ui/form/index.js'
import { SectionCard } from '../../modules/shared/ui/layout/index.js'
import { FeedbackBar, useFeedbackState } from '../../modules/shared/ui/feedback/index.js'
import {
  createEmptyPregnancyForm,
  createPregnancyFormFromDetail,
} from '../../modules/pregnancies/pregnancies.adapters.js'
import { PREGNANCY_MILESTONE_STATUS_LABELS, PREGNANCY_STATUS_LABELS } from '../../modules/shared/enums/pregnancy.enums.js'
import { PATIENT_CATEGORY_LABELS } from '../../modules/shared/enums/patient.enums.js'

const CONCEPTION_OPTIONS = [
  { v: 'spontaneous', l: 'Spontaneous' },
  { v: 'assisted', l: 'Assisted' },
  { v: 'ivf', l: 'IVF' },
  { v: 'unknown', l: 'Unknown' },
]

const RH_FACTOR_OPTIONS = [
  { v: 'unknown', l: 'Unknown' },
  { v: 'positive', l: 'Positive' },
  { v: 'negative', l: 'Negative' },
]

const STATUS_OPTIONS = Object.entries(PREGNANCY_STATUS_LABELS).map(([value, label]) => ({ v: value, l: label }))
const MILESTONE_STATUS_OPTIONS = Object.entries(PREGNANCY_MILESTONE_STATUS_LABELS).map(([value, label]) => ({ v: value, l: label }))

function getRiskBadgeTone(highRisk) {
  return highRisk ? 'high' : 'done'
}

function getPatientInitials(name = '') {
  const normalized = String(name || '').trim()
  if (!normalized) return 'PT'
  return normalized.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
}

function getAvatarIndex(seed = '') {
  return Array.from(String(seed || '0')).reduce((total, char) => total + char.charCodeAt(0), 0) % 5
}

function buildCreateState({ patientId, doctorId, consultationId }) {
  return createEmptyPregnancyForm({ patientId, doctorId, consultationId })
}

export default function CatTracker({
  patient,
  pregnancy,
  milestones,
  consultationId,
  isLoading,
  error,
  onRetry,
  onCreatePregnancy,
  onUpdatePregnancy,
  onUpdateHighRisk,
  onUpdateMilestoneStatus,
  onOpenPatientHub,
  onOpenConsultation,
}) {
  const patientSummary = patient?.summary || null
  const [createForm, setCreateForm] = useState(buildCreateState({ patientId: patientSummary?.id, doctorId: pregnancy?.doctorId, consultationId }))
  const [editForm, setEditForm] = useState(createEmptyPregnancyForm())
  const [highRiskForm, setHighRiskForm] = useState({
    high_risk: false,
    high_risk_flags_text: '',
    high_risk_notes: '',
  })
  const [actionMode, setActionMode] = useState(null)
  const [actionError, setActionError] = useState(null)
  const { feedback, showSuccess, clearFeedback } = useFeedbackState()

  useEffect(() => {
    setCreateForm(buildCreateState({
      patientId: patientSummary?.id,
      doctorId: pregnancy?.doctorId,
      consultationId,
    }))
  }, [consultationId, patientSummary?.id, pregnancy?.doctorId])

  useEffect(() => {
    if (!pregnancy) {
      setEditForm(createEmptyPregnancyForm())
      setHighRiskForm({
        high_risk: false,
        high_risk_flags_text: '',
        high_risk_notes: '',
      })
      return
    }

    const nextForm = createPregnancyFormFromDetail(pregnancy)
    setEditForm(nextForm)
    setHighRiskForm({
      high_risk: Boolean(pregnancy.highRisk),
      high_risk_flags_text: pregnancy.highRiskFlagsText || '',
      high_risk_notes: pregnancy.highRiskNotes || '',
    })
  }, [pregnancy?.id])

  const currentMilestones = milestones?.length ? milestones : pregnancy?.milestones || []
  const canTrackPregnancy = patientSummary && (patientSummary.category === 'pregnancy' || pregnancy)

  const snapshotCards = useMemo(() => {
    if (!pregnancy) return []
    return [
      { id: 'gestation', icon: 'Wk', num: pregnancy.gestationalAgeLabel, label: 'Gestational Age', ac: 't' },
      { id: 'trimester', icon: 'Tri', num: pregnancy.trimesterLabel, label: 'Current Trimester', ac: 'm' },
      { id: 'milestones', icon: 'Mil', num: `${pregnancy.milestonesCompleted}/${currentMilestones.length}`, label: 'Milestones Done', ac: 'ok' },
      { id: 'risk', icon: 'Risk', num: pregnancy.highRisk ? 'High Risk' : 'Stable', label: 'Risk Status', ac: pregnancy.highRisk ? 'wn' : 'g' },
    ]
  }, [currentMilestones.length, pregnancy])

  const handleCreateChange = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
  }

  const handleEditChange = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  const handleHighRiskChange = (field, value) => {
    setHighRiskForm((current) => ({ ...current, [field]: value }))
  }

  const runAction = async (mode, action) => {
    setActionMode(mode)
    setActionError(null)
    clearFeedback()
    try {
      await action()
      const labels = { 'save-pregnancy': 'Pregnancy record updated.', 'save-high-risk': 'High-risk profile updated.', 'create-pregnancy': 'Pregnancy record created.' }
      showSuccess(labels[mode] || 'Pregnancy workflow updated.', 'Pregnancy updated')
    } catch (nextError) {
      setActionError(nextError)
    } finally {
      setActionMode(null)
    }
  }

  return (
    <AsyncContent
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!patientSummary}
      emptyTitle="Open a patient first"
      emptyMessage="Select a pregnancy patient from the doctor patient hub or consultation workspace before opening the category tracker."
    >
      <div>
        <PH
          title={`Pregnancy Tracker - ${patientSummary?.name || 'Patient'}`}
          icon="pregnancy"
          sub={`${patientSummary?.patientCode || '--'} • ${PATIENT_CATEGORY_LABELS[patientSummary?.category || 'uncategorized'] || 'Uncategorized'}${pregnancy?.gestationalAgeLabel ? ` • ${pregnancy.gestationalAgeLabel}` : ''}`}
          actions={(
            <>
              <button style={S.btn('ghost', true)} onClick={() => onOpenPatientHub?.(patientSummary?.id)}>Patient Hub</button>
              <button style={S.btn('outline', true)} onClick={() => onOpenConsultation?.(patientSummary?.id)}>Consultation</button>
            </>
          )}
        />

        {patientSummary ? (
          <div style={{ background: `linear-gradient(135deg,${C.t},${C.tB})`, borderRadius: 12, padding: '12px 16px', color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Av i={getPatientInitials(patientSummary.name)} idx={getAvatarIndex(patientSummary.id || patientSummary.patientCode)} sz={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 17, fontWeight: 700 }}>{patientSummary.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)' }}>{patientSummary.patientCode} • {patientSummary.phone || '--'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <Bdg type={pregnancy ? getRiskBadgeTone(pregnancy.highRisk) : 'pending'}>{pregnancy ? pregnancy.statusLabel : 'Not Started'}</Bdg>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{pregnancy?.eddLabel ? `EDD ${pregnancy.eddLabel}` : 'Create pregnancy record to begin tracking'}</div>
            </div>
          </div>
        ) : null}

        {!canTrackPregnancy ? (
          <div style={{ ...S.card({ background: C.wnL, border: `1.5px solid ${C.wn}40`, boxShadow: 'none' }), marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.wn, marginBottom: 6 }}>Pregnancy tracking is intended for patients categorised as Pregnancy.</div>
            <div style={{ fontSize: 13, color: C.kB, lineHeight: 1.6 }}>
              Current category is <strong>{PATIENT_CATEGORY_LABELS[patientSummary?.category || 'uncategorized'] || 'Uncategorized'}</strong>. You can still create a pregnancy record if clinically required, but the recommended workflow is to update category during consultation first.
            </div>
          </div>
        ) : null}

        {feedback ? <div style={{ marginBottom: 14 }}><FeedbackBar tone={feedback.tone} title={feedback.title} message={feedback.message} onDismiss={clearFeedback} compact /></div> : null}
        {actionError ? (
          <div style={{ marginBottom: 14 }}><FeedbackBar tone="error" title="Pregnancy action failed" message={actionError.message || 'Pregnancy action failed.'} onDismiss={() => setActionError(null)} compact /></div>
        ) : null}

        {pregnancy ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 16 }}>
              {snapshotCards.map((card) => (
                <SC key={card.id} icon={card.icon} num={card.num} label={card.label} ac={card.ac} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16, marginBottom: 16 }}>
              <SectionCard title="Pregnancy Details" right={<Bdg type={pregnancy.highRisk ? 'high' : 'done'} sm>{pregnancy.highRisk ? 'High Risk' : 'Stable'}</Bdg>}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <TextField label="Pregnancy Number" inputProps={{ value: editForm.pregnancy_number, onChange: (event) => handleEditChange('pregnancy_number', event.target.value), placeholder: '1' }} />
                  <SelectField label="Conception Type" options={CONCEPTION_OPTIONS} selectProps={{ value: editForm.conception_type, onChange: (event) => handleEditChange('conception_type', event.target.value) }} />
                  <TextField label="LMP Date" inputProps={{ type: 'date', value: editForm.lmp_date, onChange: (event) => handleEditChange('lmp_date', event.target.value) }} />
                  <TextField label="EDD" inputProps={{ type: 'date', value: editForm.edd, onChange: (event) => handleEditChange('edd', event.target.value) }} />
                  <TextField label="Gravida" inputProps={{ value: editForm.gravida, onChange: (event) => handleEditChange('gravida', event.target.value), placeholder: '1' }} />
                  <TextField label="Para" inputProps={{ value: editForm.para, onChange: (event) => handleEditChange('para', event.target.value), placeholder: '0' }} />
                  <TextField label="Abortions" inputProps={{ value: editForm.abortions, onChange: (event) => handleEditChange('abortions', event.target.value), placeholder: '0' }} />
                  <TextField label="Living Children" inputProps={{ value: editForm.living_children, onChange: (event) => handleEditChange('living_children', event.target.value), placeholder: '0' }} />
                  <TextField label="Current Weight (kg)" inputProps={{ value: editForm.current_weight_kg, onChange: (event) => handleEditChange('current_weight_kg', event.target.value), placeholder: '60' }} />
                  <TextField label="Pre-pregnancy Weight (kg)" inputProps={{ value: editForm.pre_pregnancy_weight_kg, onChange: (event) => handleEditChange('pre_pregnancy_weight_kg', event.target.value), placeholder: '58' }} />
                  <TextField label="Blood Group" inputProps={{ value: editForm.blood_group, onChange: (event) => handleEditChange('blood_group', event.target.value), placeholder: 'B+' }} />
                  <SelectField label="RH Factor" options={RH_FACTOR_OPTIONS} selectProps={{ value: editForm.rh_factor, onChange: (event) => handleEditChange('rh_factor', event.target.value) }} />
                  <SelectField label="Pregnancy Status" options={STATUS_OPTIONS} selectProps={{ value: editForm.status, onChange: (event) => handleEditChange('status', event.target.value) }} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <TextAreaField label="Pregnancy Notes" textareaProps={{ value: editForm.pregnancy_notes, onChange: (event) => handleEditChange('pregnancy_notes', event.target.value), placeholder: 'Clinical notes for pregnancy follow-up.', style: { ...S.inp, minHeight: 96, resize: 'vertical' } }} />
                </div>
                <FormActions>
                  <LoadingButton label="Save Pregnancy" loadingLabel="Saving..." loading={actionMode === 'save-pregnancy'} onClick={() => runAction('save-pregnancy', () => onUpdatePregnancy?.(editForm))} />
                </FormActions>
              </SectionCard>

              <SectionCard title="High-Risk Management" right={<Bdg type={pregnancy.highRisk ? 'high' : 'done'} sm>{pregnancy.highRisk ? 'Escalated' : 'Normal'}</Bdg>}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.kB }}>
                    <input type="checkbox" checked={highRiskForm.high_risk} onChange={(event) => handleHighRiskChange('high_risk', event.target.checked)} />
                    Mark as high-risk pregnancy
                  </label>
                  <TextAreaField
                    label="High-Risk Flags"
                    hint="One flag per line. Use 'label | notes' to add notes to a flag."
                    textareaProps={{
                      value: highRiskForm.high_risk_flags_text,
                      onChange: (event) => handleHighRiskChange('high_risk_flags_text', event.target.value),
                      placeholder: 'Previous LSCS | Monitor closely\nGDM | Review sugar log',
                      style: { ...S.inp, minHeight: 110, resize: 'vertical' },
                      disabled: !highRiskForm.high_risk,
                    }}
                  />
                  <TextAreaField
                    label="High-Risk Notes"
                    textareaProps={{
                      value: highRiskForm.high_risk_notes,
                      onChange: (event) => handleHighRiskChange('high_risk_notes', event.target.value),
                      placeholder: 'Escalation notes, counselling, investigations pending.',
                      style: { ...S.inp, minHeight: 110, resize: 'vertical' },
                      disabled: !highRiskForm.high_risk,
                    }}
                  />
                  <FormActions>
                    <LoadingButton label="Update High-Risk" loadingLabel="Updating..." variant={highRiskForm.high_risk ? 'danger' : 'outline'} loading={actionMode === 'save-high-risk'} onClick={() => runAction('save-high-risk', () => onUpdateHighRisk?.(highRiskForm))} />
                  </FormActions>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Milestones" right={<Bdg type="wait" sm>{currentMilestones.length} entries</Bdg>}>
              <AsyncContent
                isEmpty={!currentMilestones.length}
                emptyTitle="No milestones available"
                emptyMessage="Milestones generated from the pregnancy protocol will appear here once the backend provides them."
                compact
              >
                <div style={{ display: 'grid', gap: 10 }}>
                  {currentMilestones.map((milestone) => (
                    <div key={milestone.code} style={{ border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12, background: C.w }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.k }}>{milestone.title}</div>
                          <div style={{ fontSize: 11, color: C.kS }}>Week {milestone.targetWeekLabel} • {milestone.actualDateLabel !== '--' ? milestone.actualDateLabel : 'Pending actual date'}</div>
                        </div>
                        <Bdg type={milestone.status === 'completed' ? 'done' : milestone.status === 'skipped' ? 'pending' : 'wait'}>{milestone.statusLabel}</Bdg>
                      </div>
                      {milestone.notes ? <div style={{ fontSize: 12, color: C.kB, marginBottom: 8 }}>{milestone.notes}</div> : null}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {MILESTONE_STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.v}
                            type="button"
                            style={{ ...S.btn(milestone.status === option.v ? 'primary' : 'outline', true), padding: '4px 9px', fontSize: 11 }}
                            onClick={() => runAction(`milestone-${milestone.code}-${option.v}`, () => onUpdateMilestoneStatus?.(milestone.code, option.v))}
                            disabled={pregnancy.status !== 'active'}
                          >
                            {option.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AsyncContent>
            </SectionCard>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
            <SectionCard title="Create Pregnancy Record">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <TextField label="Pregnancy Number" inputProps={{ value: createForm.pregnancy_number, onChange: (event) => handleCreateChange('pregnancy_number', event.target.value), placeholder: '1' }} />
                <SelectField label="Conception Type" options={CONCEPTION_OPTIONS} selectProps={{ value: createForm.conception_type, onChange: (event) => handleCreateChange('conception_type', event.target.value) }} />
                <TextField label="LMP Date" inputProps={{ type: 'date', value: createForm.lmp_date, onChange: (event) => handleCreateChange('lmp_date', event.target.value) }} />
                <TextField label="EDD" hint="Provide either LMP or EDD." inputProps={{ type: 'date', value: createForm.edd, onChange: (event) => handleCreateChange('edd', event.target.value) }} />
                <TextField label="Gravida" inputProps={{ value: createForm.gravida, onChange: (event) => handleCreateChange('gravida', event.target.value), placeholder: '1' }} />
                <TextField label="Para" inputProps={{ value: createForm.para, onChange: (event) => handleCreateChange('para', event.target.value), placeholder: '0' }} />
                <TextField label="Abortions" inputProps={{ value: createForm.abortions, onChange: (event) => handleCreateChange('abortions', event.target.value), placeholder: '0' }} />
                <TextField label="Living Children" inputProps={{ value: createForm.living_children, onChange: (event) => handleCreateChange('living_children', event.target.value), placeholder: '0' }} />
                <TextField label="Current Weight (kg)" inputProps={{ value: createForm.current_weight_kg, onChange: (event) => handleCreateChange('current_weight_kg', event.target.value), placeholder: '60' }} />
                <TextField label="Pre-pregnancy Weight (kg)" inputProps={{ value: createForm.pre_pregnancy_weight_kg, onChange: (event) => handleCreateChange('pre_pregnancy_weight_kg', event.target.value), placeholder: '58' }} />
                <TextField label="Blood Group" inputProps={{ value: createForm.blood_group, onChange: (event) => handleCreateChange('blood_group', event.target.value), placeholder: 'B+' }} />
                <SelectField label="RH Factor" options={RH_FACTOR_OPTIONS} selectProps={{ value: createForm.rh_factor, onChange: (event) => handleCreateChange('rh_factor', event.target.value) }} />
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.kB }}>
                  <input type="checkbox" checked={createForm.high_risk} onChange={(event) => handleCreateChange('high_risk', event.target.checked)} />
                  Start as high-risk pregnancy
                </label>
                <TextAreaField label="High-Risk Flags" hint="One flag per line. Use 'label | notes' format when needed." textareaProps={{ value: createForm.high_risk_flags_text, onChange: (event) => handleCreateChange('high_risk_flags_text', event.target.value), placeholder: 'Previous LSCS\nGDM | Monitor fasting sugars', style: { ...S.inp, minHeight: 88, resize: 'vertical' }, disabled: !createForm.high_risk }} />
                <TextAreaField label="High-Risk Notes" textareaProps={{ value: createForm.high_risk_notes, onChange: (event) => handleCreateChange('high_risk_notes', event.target.value), placeholder: 'Counselling and monitoring plan.', style: { ...S.inp, minHeight: 90, resize: 'vertical' }, disabled: !createForm.high_risk }} />
                <TextAreaField label="Pregnancy Notes" textareaProps={{ value: createForm.pregnancy_notes, onChange: (event) => handleCreateChange('pregnancy_notes', event.target.value), placeholder: 'Initial antenatal notes.', style: { ...S.inp, minHeight: 92, resize: 'vertical' } }} />
              </div>
              <FormActions>
                <LoadingButton label="Create Pregnancy Record" loadingLabel="Creating..." loading={actionMode === 'create-pregnancy'} onClick={() => runAction('create-pregnancy', () => onCreatePregnancy?.(createForm))} />
              </FormActions>
            </SectionCard>

            <SectionCard title="Why this page is now live">
              <div style={{ display: 'grid', gap: 10, fontSize: 13, color: C.kB, lineHeight: 1.6 }}>
                <div>The tracker now uses the real pregnancy record, milestones, and high-risk APIs instead of patient-local mock state.</div>
                <div>Journey Plan remains a controlled deferred route. IVF tracker also remains deferred and is not activated here.</div>
                {consultationId ? <div>New pregnancy creation will link this record back to the consultation in progress.</div> : null}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </AsyncContent>
  )
}
