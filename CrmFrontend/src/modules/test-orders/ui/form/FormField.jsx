import { C } from '../../../../crm/data.js'
import { FG, Inp, Sel, TA } from '../../../../crm/atoms.jsx'

export function FormField({ label, req, hint, error, children }) {
  return (
    <FG label={label} req={req}>
      {children}
      {error ? <div style={{ fontSize: 11, color: C.er }}>{error}</div> : null}
      {!error && hint ? <div style={{ fontSize: 11, color: C.kS }}>{hint}</div> : null}
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
