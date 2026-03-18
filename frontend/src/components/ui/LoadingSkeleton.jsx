/**
 * GyneCRM — LoadingSkeleton
 * Phase 7.5 — Shared UI Components
 *
 * Named variants for the most common loading shapes.
 * All use the .skeleton shimmer animation from index.css.
 *
 * Usage:
 *   <SkeletonLine />                      — single text line
 *   <SkeletonCard />                      — card with 3 lines
 *   <SkeletonTable rows={5} cols={4} />   — table body
 *   <SkeletonKPI count={4} />             — KPI card row
 *   <SkeletonAvatar />                    — circular avatar
 */

import { cn } from '@utils';

// ─── Primitive ────────────────────────────────────────────────────────────────
export function SkeletonBox({ className }) {
  return <div className={cn('skeleton rounded', className)} />;
}

// ─── Text line ────────────────────────────────────────────────────────────────
export function SkeletonLine({ width = 'w-full', height = 'h-3.5', className }) {
  return <SkeletonBox className={cn('rounded-full', width, height, className)} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function SkeletonAvatar({ size = 'w-10 h-10', className }) {
  return <SkeletonBox className={cn('rounded-full shrink-0', size, className)} />;
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={cn('card space-y-3', className)}>
      <SkeletonLine width="w-1/3" height="h-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────
export function SkeletonListRow({ className }) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      <SkeletonAvatar size="w-9 h-9" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-1/3" height="h-3.5" />
        <SkeletonLine width="w-1/2" height="h-3" />
      </div>
      <SkeletonLine width="w-20" height="h-6" className="rounded-full" />
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function SkeletonTable({ rows = 5, cols = 5, className }) {
  return (
    <div className={cn('space-y-0', className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-surface-muted border-b border-surface-border">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="flex-1" height="h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className={cn(
            'flex gap-4 px-4 py-3.5 border-b border-surface-divider',
            ri % 2 === 0 ? 'bg-white' : 'bg-surface-muted/40',
          )}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <SkeletonLine
              key={ci}
              width="flex-1"
              height="h-3"
              className={ci === cols - 1 ? 'w-16' : ''}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── KPI cards row ────────────────────────────────────────────────────────────
export function SkeletonKPI({ count = 4, className }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonLine width="w-1/2" height="h-3.5" />
            <SkeletonBox className="w-9 h-9 rounded-xl" />
          </div>
          <SkeletonLine width="w-24" height="h-7" />
          <SkeletonLine width="w-1/3" height="h-3" />
        </div>
      ))}
    </div>
  );
}

// ─── Patient profile header ───────────────────────────────────────────────────
export function SkeletonProfileHeader({ className }) {
  return (
    <div className={cn('card flex items-start gap-5', className)}>
      <SkeletonAvatar size="w-16 h-16" />
      <div className="flex-1 space-y-3">
        <SkeletonLine width="w-48" height="h-5" />
        <SkeletonLine width="w-32" height="h-3.5" />
        <div className="flex gap-2">
          <SkeletonLine width="w-20" height="h-6" className="rounded-full" />
          <SkeletonLine width="w-24" height="h-6" className="rounded-full" />
        </div>
      </div>
    </div>
  );
}
