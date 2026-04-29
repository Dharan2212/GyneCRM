import { useMemo, useState } from 'react'
import { C } from '../data.js'
import { S } from '../styles.js'
import { PH } from '../atoms.jsx'
import { ErrorState } from '../../modules/shared/ui/state/ErrorState.jsx'
import { FormActions, FormCard, FormGrid, LoadingButton, SelectField, TextAreaField, TextField } from '../../modules/shared/ui/form/index.js'
import {
  adaptRegisteredPatient,
  createPatientRegistrationForm,
  mapRegisterPatientFormToPayload,
  validatePatientRegistrationForm,
} from '../../modules/patients/patients.adapters.js'

const BLOOD_GROUP_OPTIONS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

function SuccessBanner({ patient, onRegisterAnother, onGoToDesk }) {
  return (
    <div style={{ background: `${C.ok}12`, border: `1.5px solid ${C.ok}40`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, color: C.ok, marginBottom: 4 }}>Patient registered successfully</div>
      <div style={{ fontSize: 13, color: C.kB, marginBottom: 10 }}>
        {patient.name} • {patient.patientCode} • {patient.phone}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={S.btn('primary', true)} onClick={onRegisterAnother}>Register Another Patient</button>
        <button type="button" style={S.btn('ghost', true)} onClick={onGoToDesk}>Go to Reception Desk</button>
      </div>
    </div>
  )
}

export default function RxRegister({ onSubmit, isSubmitting, submitError, onResetError, goTo }) {
  const [form, setForm] = useState(createPatientRegistrationForm())
  const [fieldErrors, setFieldErrors] = useState({})
  const [successPatient, setSuccessPatient] = useState(null)

  const addressPreview = useMemo(() => [form.address_line_1, form.area, form.city].filter(Boolean).join(', '), [form.address_line_1, form.area, form.city])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
    if (submitError) {
      onResetError?.()
    }
  }

  const clearForm = () => {
    setForm(createPatientRegistrationForm())
    setFieldErrors({})
    setSuccessPatient(null)
    onResetError?.()
  }

  const handleSubmit = async () => {
    const nextErrors = validatePatientRegistrationForm(form)
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const created = await onSubmit(mapRegisterPatientFormToPayload(form))
      setSuccessPatient(adaptRegisteredPatient(created))
      setForm(createPatientRegistrationForm())
      setFieldErrors({})
    } catch {
      // handled through submitError prop
    }
  }

  return (
    <div>
      <PH
        title="Register New Patient"
        icon="register"
        sub="Receptionist - capture registration details only. Doctor assigns category after first consultation."
        actions={(
          <>
            <button style={S.btn('ghost', true)} onClick={clearForm}>Clear</button>
            <button style={S.btn('outline', true)} onClick={() => goTo('rx-queue')}>Back to Desk</button>
          </>
        )}
      />

      <div style={{ background: C.wnL, border: `1.5px solid ${C.wn}40`, borderRadius: 8, padding: '8px 13px', marginBottom: 13, fontSize: 13, color: C.wn }}>
        Important: Do NOT assign a category. Doctor categorizes the patient later during consultation.
      </div>

      {successPatient ? (
        <SuccessBanner
          patient={successPatient}
          onRegisterAnother={() => setSuccessPatient(null)}
          onGoToDesk={() => goTo('rx-queue')}
        />
      ) : null}

      {submitError ? (
        <div style={{ marginBottom: 14 }}>
          <ErrorState
            title="Unable to register patient"
            message={submitError?.message || 'Please review the details and try again.'}
            onRetry={handleSubmit}
            compact
          />
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormCard title="Personal Information" subtitle="Capture the registration fields supported by the live patient create contract.">
          <FormGrid columns={2} gap={10}>
            <TextField label="Full Name" req error={fieldErrors.full_name} inputProps={{ value: form.full_name, onChange: (e) => updateField('full_name', e.target.value), placeholder: 'Patient full name' }} />
            <TextField label="Phone" req error={fieldErrors.phone} inputProps={{ value: form.phone, onChange: (e) => updateField('phone', e.target.value), placeholder: 'Primary mobile number' }} />
            <TextField label="Alternate Phone" error={fieldErrors.alternate_phone} inputProps={{ value: form.alternate_phone, onChange: (e) => updateField('alternate_phone', e.target.value), placeholder: 'Optional alternate number' }} />
            <TextField label="Date of Birth" error={fieldErrors.date_of_birth} inputProps={{ type: 'date', value: form.date_of_birth, onChange: (e) => updateField('date_of_birth', e.target.value) }} />
            <SelectField label="Blood Group" options={BLOOD_GROUP_OPTIONS} selectProps={{ value: form.blood_group, onChange: (e) => updateField('blood_group', e.target.value) }} />
            <TextField label="Family WhatsApp" error={fieldErrors.family_whatsapp} inputProps={{ value: form.family_whatsapp, onChange: (e) => updateField('family_whatsapp', e.target.value), placeholder: 'WhatsApp number for updates' }} />
            <TextField label="Address Line" inputProps={{ value: form.address_line_1, onChange: (e) => updateField('address_line_1', e.target.value), placeholder: 'House / street / area' }} />
            <TextField label="Area" inputProps={{ value: form.area, onChange: (e) => updateField('area', e.target.value), placeholder: 'Area / locality' }} />
            <TextField label="City" inputProps={{ value: form.city, onChange: (e) => updateField('city', e.target.value), placeholder: 'City' }} />
            <TextField label="State" inputProps={{ value: form.state, onChange: (e) => updateField('state', e.target.value), placeholder: 'State' }} />
            <TextField label="Postal Code" inputProps={{ value: form.postal_code, onChange: (e) => updateField('postal_code', e.target.value), placeholder: 'PIN code' }} />
          </FormGrid>

          <FormActions>
            <LoadingButton label="Save Registration" loadingLabel="Saving..." loading={isSubmitting} variant="ok" onClick={handleSubmit} />
            <LoadingButton label="Clear" variant="ghost" small onClick={clearForm} disabled={isSubmitting} />
          </FormActions>
        </FormCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <FormCard title="Emergency & Background" subtitle="Record optional safety and medical context without assigning category.">
            <FormGrid columns={1} gap={10}>
              <TextField label="Emergency Contact Name" inputProps={{ value: form.emergency_name, onChange: (e) => updateField('emergency_name', e.target.value), placeholder: 'Contact person' }} />
              <TextField label="Emergency Contact Relation" inputProps={{ value: form.emergency_relation, onChange: (e) => updateField('emergency_relation', e.target.value), placeholder: 'Relation to patient' }} />
              <TextField label="Emergency Contact Phone" error={fieldErrors.emergency_phone} inputProps={{ value: form.emergency_phone, onChange: (e) => updateField('emergency_phone', e.target.value), placeholder: 'Emergency contact number' }} />
              <TextAreaField label="Known Conditions" hint="Comma-separated if needed" textareaProps={{ value: form.existing_conditions, onChange: (e) => updateField('existing_conditions', e.target.value), style: { ...S.inp, minHeight: 70, resize: 'vertical' }, placeholder: 'e.g. thyroid, hypertension' }} />
              <TextAreaField label="Allergies" hint="Comma-separated if needed" textareaProps={{ value: form.allergies, onChange: (e) => updateField('allergies', e.target.value), style: { ...S.inp, minHeight: 70, resize: 'vertical' }, placeholder: 'Known allergies' }} />
              <TextAreaField label="Medical Notes" textareaProps={{ value: form.medical_notes, onChange: (e) => updateField('medical_notes', e.target.value), style: { ...S.inp, minHeight: 90, resize: 'vertical' }, placeholder: 'Any important registration note or background context' }} />
            </FormGrid>
          </FormCard>

          <FormCard title="What happens next?" subtitle="The receptionist completes registration, then the doctor takes over the clinical workflow." tone="soft">
            {[
              { n: '1', t: 'Patient registration is saved to the live backend', s: 'A unique patient code is generated automatically.' },
              { n: '2', t: 'Reception keeps category unassigned', s: 'Category assignment stays doctor-controlled.' },
              { n: '3', t: 'Doctor starts the first consultation later', s: 'Clinical category and workflow are decided there.' },
              { n: '4', t: 'Address preview', s: addressPreview || 'Address details will appear here once entered.' },
            ].map((step, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 19, height: 19, borderRadius: '50%', background: C.t, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{step.n}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.t }}>{step.t}</div>
                  <div style={{ fontSize: 11, color: C.kS }}>{step.s}</div>
                </div>
              </div>
            ))}
          </FormCard>
        </div>
      </div>
    </div>
  )
}
