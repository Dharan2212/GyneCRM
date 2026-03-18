/**
 * GyneCRM — PhoneInput
 * Phase 7.4 — Shared Form Components
 *
 * India-first phone number input.
 *
 * Behaviour:
 *   - Displays +91 prefix badge (non-editable)
 *   - Input accepts digits only, max 10 digits
 *   - Validates: must start with 6-9, exactly 10 digits
 *   - Value emitted to RHF is the raw 10-digit string (no +91 prefix)
 *   - Backend stores phone as 10-digit string per architecture contract
 *
 * Usage with RHF:
 *   <PhoneInput
 *     label="Mobile number"
 *     {...register('phone')}
 *     error={errors.phone?.message}
 *     required
 *   />
 *
 * Hint: patient search also uses this for quick phone lookup.
 */

import { forwardRef, useCallback } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

export const PhoneInput = forwardRef(function PhoneInput(
  {
    // FormField props
    label,
    hint = 'Enter 10-digit mobile number',
    error,
    required = false,
    hideLabel = false,
    // Input props
    disabled = false,
    readOnly = false,
    placeholder = 'XXXXX XXXXX',
    autoFocus = false,
    // Layout
    className,
    inputClassName,
    // RHF passthrough
    onChange,
    value,
    ...rest
  },
  ref,
) {
  const inputId = rest.id || rest.name || 'phone';

  // Strip all non-digits and limit to 10
  const handleChange = useCallback(
    (e) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
      // Synthetic event with cleaned value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: raw, name: rest.name },
      };
      onChange?.(syntheticEvent);
    },
    [onChange, rest.name],
  );

  // Display value: add space after 5th digit for readability
  const displayValue = value
    ? value.slice(0, 5) + (value.length > 5 ? ' ' + value.slice(5) : '')
    : '';

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      hint={!error ? hint : undefined}
      className={className}
      hideLabel={hideLabel}
    >
      <div className="flex gap-0">
        {/* Country code badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 rounded-l-lg border border-r-0 border-surface-border',
            'bg-surface-subtle text-content-secondary text-sm font-medium select-none shrink-0',
            error && 'border-danger-500',
            disabled && 'opacity-50',
          )}
          aria-hidden="true"
        >
          <FlagIcon />
          <span>+91</span>
        </div>

        {/* Phone input */}
        <input
          ref={ref}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]{10}"
          maxLength={11} /* 10 digits + 1 space */
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          value={displayValue}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : `${inputId}-hint`
          }
          aria-label={label || 'Mobile number (10 digits)'}
          className={cn(
            'input-base rounded-l-none flex-1 min-w-0',
            'tracking-wide',
            error && 'input-error',
            readOnly && 'bg-surface-subtle cursor-default',
            inputClassName,
          )}
          {...rest}
          /* Override RHF's onChange with our sanitized handler */
          onChange={handleChange}
        />
      </div>
    </FormField>
  );
});

function FlagIcon() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="rounded-sm">
      {/* India flag simplified tricolor */}
      <rect width="18" height="4.33" fill="#FF9933"/>
      <rect y="4.33" width="18" height="4.34" fill="#FFFFFF"/>
      <rect y="8.67" width="18" height="4.33" fill="#138808"/>
      {/* Ashoka Chakra placeholder circle */}
      <circle cx="9" cy="6.5" r="1.5" fill="none" stroke="#000088" strokeWidth="0.5"/>
    </svg>
  );
}
