/**
 * GyneCRM — FormField
 * Phase 7.4 — Shared Form Components
 *
 * The single source of truth for label / hint / error / spacing.
 * Every form component delegates its outer structure to FormField.
 *
 * Usage:
 *   <FormField label="Full name" required error={errors.name?.message} hint="As per ID">
 *     <input ... />
 *   </FormField>
 *
 * Props:
 *   label      — visible label text
 *   htmlFor    — links label to input id
 *   required   — shows teal asterisk
 *   error      — error string (from RHF or backend)
 *   hint       — helper text shown below input when no error
 *   className  — extra class on the outer wrapper
 *   children   — the actual form control
 *   hideLabel  — visually hide label (kept for screen readers)
 *   labelRight — node rendered to the right of the label (e.g. char count)
 */

import { cn } from '@utils';

export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className,
  children,
  hideLabel = false,
  labelRight,
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId  = htmlFor ? `${htmlFor}-hint`  : undefined;

  return (
    <div className={cn('form-group', className)}>
      {/* Label row */}
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className={cn(
              'form-label',
              required && 'form-label-required',
              hideLabel && 'sr-only',
            )}
          >
            {label}
          </label>
          {labelRight && (
            <span className="text-xs text-content-disabled">{labelRight}</span>
          )}
        </div>
      )}

      {/* Control slot */}
      {children}

      {/* Feedback text */}
      {error ? (
        <p id={errorId} role="alert" className="input-error-text">
          <ErrorIcon />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="input-help">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
