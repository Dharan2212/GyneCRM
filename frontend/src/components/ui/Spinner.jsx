/**
 * GyneCRM — Spinner
 * Phase 7.5 — Shared UI Components
 *
 * Sizes: xs, sm, md (default), lg, xl
 * Colors: primary (default), white, muted
 */

import { cn } from '@utils';

const SIZE_MAP = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

const COLOR_MAP = {
  primary: 'border-primary-200 border-t-primary-500',
  white:   'border-white/30 border-t-white',
  muted:   'border-gray-200 border-t-gray-500',
  danger:  'border-danger-200 border-t-danger-500',
};

export function Spinner({ size = 'md', color = 'primary', className, label = 'Loading…' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block rounded-full animate-spin shrink-0',
        SIZE_MAP[size]  ?? SIZE_MAP.md,
        COLOR_MAP[color] ?? COLOR_MAP.primary,
        className,
      )}
    />
  );
}

/**
 * Full-screen centered spinner — for page-level loading.
 */
export function PageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-content-tertiary">{label}</p>
      </div>
    </div>
  );
}
