/**
 * GyneCRM — Input
 * Phase 7.4 — Shared Form Components
 *
 * Supports: text, email, password, number, tel
 * Works with React Hook Form via forwardRef.
 *
 * Usage with RHF:
 *   <Input label="Email" {...register('email')} error={errors.email?.message} />
 *
 * Standalone:
 *   <Input label="Search" value={val} onChange={e => setVal(e.target.value)} />
 */

import { forwardRef, useState } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

export const Input = forwardRef(function Input(
  {
    // FormField props
    label,
    hint,
    error,
    required = false,
    hideLabel = false,
    // Input props
    id,
    type = 'text',
    placeholder,
    disabled = false,
    readOnly = false,
    loading = false,
    // Adornment
    leftAdornment,
    rightAdornment,
    // Layout
    className,
    inputClassName,
    // RHF passthrough
    ...rest
  },
  ref,
) {
  const inputId = id || rest.name;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const hasLeft  = !!leftAdornment;
  const hasRight = !!rightAdornment || isPassword || loading;

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
        {/* Left adornment */}
        {leftAdornment && (
          <div className="pointer-events-none absolute left-3 flex items-center text-content-disabled">
            {leftAdornment}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          placeholder={placeholder}
          disabled={disabled || loading}
          readOnly={readOnly}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'input-base',
            error       && 'input-error',
            hasLeft     && 'pl-9',
            hasRight    && 'pr-10',
            readOnly    && 'bg-surface-subtle cursor-default',
            inputClassName,
          )}
          {...rest}
        />

        {/* Right adornment area */}
        {(isPassword || loading || rightAdornment) && (
          <div className="absolute right-3 flex items-center gap-1">
            {loading && (
              <span className="spinner w-4 h-4 text-content-disabled" aria-label="Loading" />
            )}
            {!loading && isPassword && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="text-content-disabled hover:text-content-secondary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}
            {!loading && !isPassword && rightAdornment && (
              <span className="text-content-disabled">{rightAdornment}</span>
            )}
          </div>
        )}
      </div>
    </FormField>
  );
});

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
