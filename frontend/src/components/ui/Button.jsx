/**
 * GyneCRM — Button
 * Phase 7.5 — Shared UI Components
 *
 * Variants: primary, secondary, ghost, danger, success
 * Sizes: sm, md (default), lg, icon
 * States: loading, disabled, with icon (left/right)
 *
 * Usage:
 *   <Button variant="primary" size="md" onClick={...}>Save</Button>
 *   <Button variant="danger" loading={isDeleting}>Delete</Button>
 *   <Button variant="ghost" size="icon" aria-label="Edit"><PencilIcon /></Button>
 *   <Button variant="primary" leftIcon={<PlusIcon />}>New Patient</Button>
 */

import { forwardRef } from 'react';
import { cn } from '@utils';

// ─── Variant class map ────────────────────────────────────────────────────────
const VARIANTS = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500 shadow-xs',
  secondary: 'bg-white text-content-primary border border-surface-border hover:bg-surface-subtle active:bg-surface-muted focus:ring-primary-500',
  ghost:     'bg-transparent text-content-secondary hover:bg-surface-subtle active:bg-surface-subtle focus:ring-primary-500',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 focus:ring-danger-500 shadow-xs',
  success:   'bg-success-600 text-white hover:bg-success-700 active:bg-success-700 focus:ring-success-500 shadow-xs',
  link:      'bg-transparent text-primary-600 hover:text-primary-700 hover:underline focus:ring-primary-500 px-0',
};

// ─── Size class map ───────────────────────────────────────────────────────────
const SIZES = {
  sm:   'h-8  px-3   text-xs  gap-1.5 rounded-lg',
  md:   'h-9  px-4   text-sm  gap-2   rounded-lg',
  lg:   'h-11 px-6   text-sm  gap-2   rounded-xl',
  xl:   'h-12 px-8   text-base gap-2.5 rounded-xl',
  icon: 'h-9  w-9    text-sm  p-0     rounded-lg justify-center',
  'icon-sm': 'h-7 w-7 text-xs p-0 rounded-md justify-center',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        // Base
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 select-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        // Variant
        VARIANTS[variant] ?? VARIANTS.primary,
        // Size
        SIZES[size] ?? SIZES.md,
        // Extra
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <SpinnerIcon size={size} />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

function SpinnerIcon({ size }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <span
      className={cn('rounded-full border-2 border-current border-t-transparent animate-spin shrink-0', sz)}
      aria-hidden="true"
    />
  );
}
