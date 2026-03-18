/**
 * GyneCRM — Radio / RadioGroup
 * Phase 7.4 — Shared Form Components
 *
 * Two exports:
 *   <Radio>       — single radio option (used inside RadioGroup or standalone)
 *   <RadioGroup>  — full grouped wrapper with label, hint, error
 *
 * Usage with RHF:
 *   <RadioGroup
 *     label="Visit type"
 *     name="visitType"
 *     options={[
 *       { value: 'new',       label: 'New Patient' },
 *       { value: 'follow_up', label: 'Follow-up',    description: 'Returning patient' },
 *       { value: 'antenatal', label: 'Antenatal'  },
 *     ]}
 *     value={watchedValue}
 *     onChange={field.onChange}
 *     error={errors.visitType?.message}
 *     required
 *   />
 *
 * Layout: horizontal (default) or vertical.
 */

import { forwardRef } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

// ─────────────────────────────────────────────────────────────────────────────
// Single Radio option
// ─────────────────────────────────────────────────────────────────────────────

export const Radio = forwardRef(function Radio(
  {
    label,
    description,
    disabled = false,
    className,
    id,
    // RHF passthrough
    ...rest
  },
  ref,
) {
  const inputId = id || `${rest.name}-${rest.value}`;
  const descId  = description ? `${inputId}-desc` : undefined;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex items-center h-5 mt-0.5">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          disabled={disabled}
          aria-describedby={descId}
          className="radio-input"
          {...rest}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium text-content-primary cursor-pointer select-none',
                disabled && 'text-content-disabled cursor-not-allowed',
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={descId}
              className={cn('text-xs text-content-tertiary', disabled && 'opacity-60')}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RadioGroup — full controlled group wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   label: string,
 *   name: string,
 *   options: Array<{ value: string, label: string, description?: string, disabled?: boolean }>,
 *   value: string,
 *   onChange: (value: string) => void,
 *   error: string,
 *   hint: string,
 *   required: boolean,
 *   direction: 'vertical' | 'horizontal',
 *   className: string,
 * }} props
 */
export function RadioGroup({
  label,
  name,
  options = [],
  value,
  onChange,
  error,
  hint,
  required = false,
  direction = 'vertical',
  className,
}) {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div
        role="radiogroup"
        aria-required={required}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        className={cn(
          direction === 'horizontal'
            ? 'flex flex-wrap gap-4'
            : 'flex flex-col gap-3',
        )}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            id={`${name}-${option.value}`}
            name={name}
            value={option.value}
            label={option.label}
            description={option.description}
            disabled={option.disabled}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
    </FormField>
  );
}
