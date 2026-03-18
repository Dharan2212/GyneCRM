/**
 * GyneCRM — Checkbox
 * Phase 7.4 — Shared Form Components
 *
 * Usage with RHF:
 *   <Checkbox
 *     label="WhatsApp communication"
 *     description="Receive appointment reminders and health tips via WhatsApp"
 *     {...register('whatsappConsent')}
 *     error={errors.whatsappConsent?.message}
 *   />
 *
 * Used for: consent forms, filters, permission toggles, bulk selection.
 */

import { forwardRef } from 'react';
import { cn } from '@utils';

export const Checkbox = forwardRef(function Checkbox(
  {
    label,
    description,
    error,
    disabled = false,
    className,
    id,
    // RHF passthrough
    ...rest
  },
  ref,
) {
  const inputId  = id || rest.name;
  const descId   = description ? `${inputId}-desc`  : undefined;
  const errorId  = error       ? `${inputId}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-describedby={[descId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? 'true' : 'false'}
            className="checkbox-input"
            {...rest}
          />
        </div>
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
              className={cn(
                'text-xs text-content-tertiary',
                disabled && 'opacity-60',
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="input-error-text ml-7">
          {error}
        </p>
      )}
    </div>
  );
});
