/**
 * GyneCRM — Textarea
 * Phase 7.4 — Shared Form Components
 *
 * Used for: consultation notes, admin comments, clinical observations,
 * prescription instructions, override reasons.
 *
 * Usage with RHF:
 *   <Textarea
 *     label="Consultation notes"
 *     rows={4}
 *     maxLength={1000}
 *     showCount
 *     {...register('notes')}
 *     error={errors.notes?.message}
 *   />
 */

import { forwardRef, useCallback, useRef } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

export const Textarea = forwardRef(function Textarea(
  {
    // FormField props
    label,
    hint,
    error,
    required = false,
    hideLabel = false,
    // Textarea-specific
    rows = 3,
    maxLength,
    showCount = false,
    autoResize = false,
    placeholder,
    disabled = false,
    readOnly = false,
    // Layout
    className,
    textareaClassName,
    // RHF passthrough (includes onChange)
    onChange,
    value,
    ...rest
  },
  ref,
) {
  const inputId = rest.id || rest.name;
  const internalRef = useRef(null);
  const resolvedRef = ref || internalRef;

  // Character count for display
  const currentLength = typeof value === 'string' ? value.length : 0;

  const handleChange = useCallback(
    (e) => {
      if (autoResize && resolvedRef?.current) {
        const el = resolvedRef.current;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
      onChange?.(e);
    },
    [autoResize, resolvedRef, onChange],
  );

  const labelRight =
    showCount && maxLength
      ? `${currentLength} / ${maxLength}`
      : showCount
      ? String(currentLength)
      : undefined;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      hint={hint}
      className={className}
      hideLabel={hideLabel}
      labelRight={labelRight}
    >
      <textarea
        ref={resolvedRef}
        id={inputId}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={handleChange}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          'input-base resize-none leading-relaxed',
          error && 'input-error',
          autoResize && 'overflow-hidden',
          readOnly && 'bg-surface-subtle cursor-default',
          textareaClassName,
        )}
        {...rest}
      />
    </FormField>
  );
});
