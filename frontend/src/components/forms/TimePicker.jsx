/**
 * GyneCRM — TimePicker
 * Phase 7.4 — Shared Form Components
 *
 * Two modes:
 *   1. native="true"  — HTML time input (always available, keyboard-friendly)
 *   2. native="false" — Custom dropdown showing 15-minute slots (appointment booking UX)
 *
 * Value contract (backend-aligned):
 *   - Value format: "HH:MM" (24-hour, e.g. "09:30", "14:45")
 *   - Backend time fields use "HH:MM:SS" — append ":00" on submit if needed
 *
 * Usage:
 *   // Native time input (default, all contexts)
 *   <TimePicker label="Appointment time" {...register('time')} error={...} />
 *
 *   // Custom slot picker (appointment booking)
 *   <TimePicker
 *     label="Select slot"
 *     native={false}
 *     slots={availableSlots}  // string[] of "HH:MM" values
 *     value={field.value}
 *     onChange={field.onChange}
 *   />
 */

import { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate full-day 15-minute time slots */
export function generate15MinSlots(startHour = 8, endHour = 20) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

/** Format "HH:MM" → "9:30 AM" display */
export function formatTimeSlot(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Native mode (default)
// ─────────────────────────────────────────────────────────────────────────────

export const TimePicker = forwardRef(function TimePicker(
  {
    // FormField props
    label,
    hint,
    error,
    required = false,
    hideLabel = false,
    // Mode
    native = true,
    slots,      // string[] — used when native=false
    // Input props
    min,
    max,
    step = 900, // 15 minutes in seconds (for native mode)
    disabled = false,
    placeholder,
    // Value (controlled)
    value,
    onChange,
    // Layout
    className,
    inputClassName,
    // RHF passthrough
    ...rest
  },
  ref,
) {
  const inputId = rest.id || rest.name;

  if (!native) {
    return (
      <SlotPicker
        label={label}
        hint={hint}
        error={error}
        required={required}
        hideLabel={hideLabel}
        id={inputId}
        slots={slots || generate15MinSlots()}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

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
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled">
          <ClockIcon />
        </span>
        <input
          ref={ref}
          id={inputId}
          type="time"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'input-base pl-9',
            '[&::-webkit-calendar-picker-indicator]:opacity-0',
            '[&::-webkit-calendar-picker-indicator]:absolute',
            '[&::-webkit-calendar-picker-indicator]:right-0',
            '[&::-webkit-calendar-picker-indicator]:w-8',
            '[&::-webkit-calendar-picker-indicator]:h-full',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
            error && 'input-error',
            inputClassName,
          )}
          {...rest}
        />
      </div>
    </FormField>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom slot picker — for appointment booking
// ─────────────────────────────────────────────────────────────────────────────

function SlotPicker({ label, hint, error, required, hideLabel, id, slots, value, onChange, disabled, className }) {
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef(null);
  const selectedRef         = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Scroll selected option into view when dropdown opens
  useEffect(() => {
    if (open && selectedRef.current) {
      setTimeout(() => selectedRef.current?.scrollIntoView({ block: 'nearest' }), 50);
    }
  }, [open]);

  return (
    <FormField
      label={label}
      htmlFor={id}
      required={required}
      error={error}
      hint={hint}
      className={className}
      hideLabel={hideLabel}
    >
      <div ref={containerRef} className="select-container">
        {/* Trigger */}
        <div
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
            if (e.key === 'Escape') setOpen(false);
          }}
          className={cn(
            'select-control',
            open && 'select-control-open',
            error && 'input-error',
            disabled && 'bg-surface-subtle text-content-disabled cursor-not-allowed',
          )}
        >
          <span className="flex items-center gap-2">
            <ClockIcon />
            <span className={cn('text-sm', !value && 'text-content-disabled')}>
              {value ? formatTimeSlot(value) : 'Select time slot…'}
            </span>
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronIcon open={open} />
          </span>
        </div>

        {/* Slot list */}
        {open && (
          <div
            role="listbox"
            aria-label="Time slots"
            className="select-dropdown max-h-56 overflow-y-auto"
          >
            {slots.length === 0 ? (
              <p className="select-empty">No slots available</p>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot}
                  ref={slot === value ? selectedRef : null}
                  role="option"
                  aria-selected={slot === value}
                  onClick={() => { onChange?.(slot); setOpen(false); }}
                  className={cn(
                    'select-option',
                    slot === value && 'select-option-selected',
                  )}
                >
                  {slot === value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      strokeLinejoin="round" className="text-primary-500 shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className={cn(slot !== value && 'pl-5')}>
                    {formatTimeSlot(slot)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true"
      className={cn('text-content-disabled transition-transform duration-150', open && 'rotate-180')}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
