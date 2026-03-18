/**
 * GyneCRM — ErrorState
 * Phase 7.5 — Shared UI Components
 *
 * Usage:
 *   <ErrorState onRetry={refetch} />
 *   <ErrorState title="Failed to load patients" description={error.message} onRetry={refetch} />
 */

import { cn } from '@utils';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading data. Please try again.',
  onRetry,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className,
      )}
    >
      {/* Error icon */}
      <div className={cn(
        'rounded-2xl bg-danger-50 flex items-center justify-center text-danger-500 mb-4',
        compact ? 'w-10 h-10' : 'w-14 h-14',
      )}>
        <svg
          width={compact ? 18 : 24} height={compact ? 18 : 24}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 className={cn('font-semibold text-content-primary', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-content-tertiary mt-1 max-w-xs', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}
