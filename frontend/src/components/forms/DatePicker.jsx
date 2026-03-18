/**
 * GyneCRM — DatePicker
 * Phase 7.4 — Shared Form Components
 *
 * Native HTML date input wrapper. Production-safe — no heavy external
 * date-picker dependency. The native date input is well-supported in all
 * modern browsers used in hospital environments and is keyboard-accessible.
 *
 * Value contract (backend-aligned):
 *   - Internal value: "YYYY-MM-DD" string (ISO 8601 date)
 *   - Backend expects: "2025-01-15" format for all date fields
 *
 * Usage with RHF:
 *   <DatePicker
 *     label="Date of Birth"
 *     {...register('dateOfBirth')}
 *     error={errors.dateOfBirth?.message}
 *     max={today}
 *     required
 *   />
 *
 * Usage with RHF Controller (for programmatic control):
 *   <Controller name="lmpDate" control={control}
 *     render={({ field, fieldState }) => (
 *       <DatePicker label="LMP Date" {...field} error={fieldState.error?.message} />
 *     )}
 *   />
 */

import { forwardRef } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

// Utility: today as YYYY-MM-DD for min/max defaults
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export const DatePicker = forwardRef(function DatePicker(
  {
    // FormField props
    label,
    hint,
    error,
    required = false,
    hideLabel = false,
    // Date props
    min,
    max,
    disabled = false,
    readOnly = false,
    placeholder,  // shown as title on some browsers
    // Layout
    className,
    inputClassName,
    // RHF passthrough
    ...rest
  },
  ref,
) {
  const inputId = rest.id || rest.name;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      hint={hint}
      className={className}
      hideLabel={hideLabel}
    >
      <div className="relative flex items-center">
        {/* Calendar icon — decorative, pointer-events-none */}
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled">
          <CalendarIcon />
        </span>

        <input
          ref={ref}
          id={inputId}
          type="date"
          min={min}
          max={max}
          disabled={disabled}
          readOnly={readOnly}
          title={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'input-base pl-9',
            /* Override native date picker calendar icon color */
            '[&::-webkit-calendar-picker-indicator]:opacity-0',
            '[&::-webkit-calendar-picker-indicator]:absolute',
            '[&::-webkit-calendar-picker-indicator]:right-0',
            '[&::-webkit-calendar-picker-indicator]:w-8',
            '[&::-webkit-calendar-picker-indicator]:h-full',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
            error && 'input-error',
            readOnly && 'bg-surface-subtle cursor-default',
            inputClassName,
          )}
          {...rest}
        />
      </div>
    </FormField>
  );
});

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
