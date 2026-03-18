/**
 * GyneCRM — KPIGrid
 * Phase 7.5 — Shared UI Components
 *
 * Responsive layout wrapper for KPI / AnalyticsCard components.
 *
 * Usage:
 *   <KPIGrid cols={4}>
 *     <AnalyticsCard title="Appointments" value={42} ... />
 *     <AnalyticsCard title="Revenue" value="₹1,24,000" ... />
 *     <AnalyticsCard title="High-risk" value={6} iconColor="danger" ... />
 *     <AnalyticsCard title="Pending tests" value={9} iconColor="warning" ... />
 *   </KPIGrid>
 *
 *   <KPIGrid cols={3} gap={6}>…</KPIGrid>
 */

import { cn } from '@utils';

const COL_MAP = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function KPIGrid({ cols = 4, gap = 4, children, className }) {
  return (
    <div
      className={cn(
        'grid',
        `gap-${gap}`,
        COL_MAP[cols] ?? COL_MAP[4],
        className,
      )}
    >
      {children}
    </div>
  );
}
