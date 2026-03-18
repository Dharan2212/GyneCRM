/**
 * GyneCRM — InfoPanel
 * Phase 7.5 — Shared UI Components
 *
 * Reusable labeled key-value panel. Used for structured metadata display.
 *
 * Used by Phase 8:
 *   - Patient summary header (name, DOB, blood group, phone, UHID)
 *   - Invoice detail panel (patient, date, branch, doctor, total)
 *   - Consultation metadata (date, doctor, visit type, outcome)
 *   - Pregnancy info card (LMP, EDD, GA weeks, protocol)
 *   - Document metadata (type, uploaded by, date, review status)
 *   - Appointment detail drawer (time, doctor, branch, visit type)
 *
 * Item shape:
 *   { label: string, value: ReactNode|string|null, span?: 1|2, hidden?: boolean }
 *
 * Usage:
 *   <InfoPanel
 *     title="Patient details"
 *     items={[
 *       { label: 'Full name',    value: patient.name },
 *       { label: 'Date of birth',value: formatDate(patient.dob) },
 *       { label: 'Phone',        value: `+91 ${patient.phone}` },
 *       { label: 'Blood group',  value: patient.bloodGroup ?? '—' },
 *       { label: 'Address',      value: patient.address, span: 2 },
 *     ]}
 *   />
 *
 *   // Grid layout (default: 2 columns)
 *   <InfoPanel title="Invoice" items={items} cols={3} />
 *
 *   // Without title (inline)
 *   <InfoPanel items={items} compact />
 */

import { cn } from '@utils';

export function InfoPanel({
  title,
  subtitle,
  items = [],
  cols = 2,
  compact = false,
  action,
  className,
}) {
  const visibleItems = items.filter((item) => !item.hidden);
  if (visibleItems.length === 0 && !title) return null;

  const COL_MAP = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={cn('info-panel', className)}>
      {/* Header */}
      {(title || action) && (
        <div className={cn(
          'flex items-center justify-between border-b border-surface-border',
          compact ? 'px-4 py-2.5' : 'px-5 py-3.5',
        )}>
          <div>
            {title && (
              <h3 className={cn('font-semibold text-content-primary', compact ? 'text-xs' : 'text-sm')}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-content-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Grid body */}
      <div className={cn(
        'grid',
        COL_MAP[cols] ?? COL_MAP[2],
        compact ? 'p-4 gap-x-6 gap-y-3' : 'p-5 gap-x-8 gap-y-4',
      )}>
        {visibleItems.map((item, idx) => (
          <InfoRow
            key={idx}
            label={item.label}
            value={item.value}
            span={item.span}
            compact={compact}
            cols={cols}
          />
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, span, compact, cols }) {
  const spanClass =
    span === 2 && cols >= 2 ? 'sm:col-span-2' :
    span === 3 && cols >= 3 ? 'sm:col-span-3' :
    '';

  return (
    <div className={cn('flex flex-col gap-0.5 min-w-0', spanClass)}>
      <dt className={cn(
        'font-medium text-content-tertiary uppercase tracking-wide',
        compact ? 'text-2xs' : 'text-xs',
      )}>
        {label}
      </dt>
      <dd className={cn(
        'text-content-primary font-medium break-words',
        compact ? 'text-xs' : 'text-sm',
        !value && 'text-content-disabled font-normal',
      )}>
        {value ?? '—'}
      </dd>
    </div>
  );
}

/**
 * InfoRow — standalone labeled field for inline use.
 * Used when a single field needs the info-panel label/value treatment
 * outside of a full panel grid.
 */
export function InfoField({ label, value, className }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-xs font-medium text-content-tertiary uppercase tracking-wide">
        {label}
      </dt>
      <dd className={cn('text-sm font-medium text-content-primary', !value && 'text-content-disabled font-normal')}>
        {value ?? '—'}
      </dd>
    </div>
  );
}
