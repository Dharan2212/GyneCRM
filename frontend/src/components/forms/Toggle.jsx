/**
 * GyneCRM — Toggle (Switch)
 * Phase 7.4 — Shared Form Components
 *
 * Modern on/off toggle switch — accessible keyboard control.
 * Not a native checkbox — uses role="switch" with aria-checked.
 * Label click toggles the switch.
 *
 * Usage with RHF Controller:
 *   <Controller
 *     name="isHighRisk"
 *     control={control}
 *     render={({ field }) => (
 *       <Toggle
 *         label="High-risk pregnancy"
 *         description="Flag patient for priority monitoring and escalated protocol"
 *         checked={field.value}
 *         onChange={field.onChange}
 *       />
 *     )}
 *   />
 *
 * Standalone:
 *   <Toggle
 *     label="WhatsApp notifications"
 *     checked={enabled}
 *     onChange={setEnabled}
 *   />
 *
 * Used for: high-risk flags, consent toggles, notification settings, feature flags.
 */

import { cn } from '@utils';

export function Toggle({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  error,
  id,
  name,
  className,
}) {
  const toggleId = id || name || 'toggle';
  const descId   = description ? `${toggleId}-desc`  : undefined;
  const errorId  = error       ? `${toggleId}-error` : undefined;

  function handleToggle() {
    if (!disabled) onChange?.(!checked);
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-3">
        {/* Toggle switch */}
        <button
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
          aria-describedby={[descId, errorId].filter(Boolean).join(' ') || undefined}
          aria-label={label}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'toggle-track mt-0.5 shrink-0',
            checked ? 'toggle-track-on' : 'toggle-track-off',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'toggle-thumb',
              checked ? 'toggle-thumb-on' : 'toggle-thumb-off',
            )}
          />
        </button>

        {/* Labels */}
        {(label || description) && (
          <div
            className="flex flex-col gap-0.5 cursor-pointer"
            onClick={handleToggle}
          >
            {label && (
              <span
                className={cn(
                  'text-sm font-medium text-content-primary select-none',
                  disabled && 'text-content-disabled',
                )}
              >
                {label}
              </span>
            )}
            {description && (
              <p
                id={descId}
                className={cn(
                  'text-xs text-content-tertiary select-none',
                  disabled && 'opacity-60',
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* State indicator on right */}
        <span
          className={cn(
            'ml-auto shrink-0 text-xs font-medium transition-colors duration-150',
            checked ? 'text-primary-600' : 'text-content-disabled',
          )}
          aria-hidden="true"
        >
          {checked ? 'On' : 'Off'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p id={errorId} role="alert" className="input-error-text ml-14">
          {error}
        </p>
      )}
    </div>
  );
}
