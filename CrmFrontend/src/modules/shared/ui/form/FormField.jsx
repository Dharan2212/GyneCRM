import { C } from '../../../../crm/data.js'
import { FG, Inp, Sel, TA } from '../../../../crm/atoms.jsx'

function FieldMessage({ children, tone = 'hint' }) {
  const color = tone === 'error' ? C.er : C.kS
  return <div style={{ fontSize: 11, color, lineHeight: 1.55, marginTop: 1 }}>{children}</div>
}

export function FormField({ label, req, hint, error, children }) {
  return (
    <FG label={label} req={req}>
      <div style={{ display: 'grid', gap: 7 }}>
        {children}
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
        {!error && hint ? <FieldMessage>{hint}</FieldMessage> : null}
      </div>
    </FG>
  )
}

export function TextField({ label, req, hint, error, inputProps }) {
  return (
    <FormField label={label} req={req} hint={hint} error={error}>
      <Inp {...inputProps} />
    </FormField>
  )
}

export function SelectField({ label, req, hint, error, options, selectProps }) {
  return (
    <FormField label={label} req={req} hint={hint} error={error}>
      <Sel opts={options} {...selectProps} />
    </FormField>
  )
}

export function TextAreaField({ label, req, hint, error, textareaProps }) {
  return (
    <FormField label={label} req={req} hint={hint} error={error}>
      <TA {...textareaProps} />
    </FormField>
  )
}
