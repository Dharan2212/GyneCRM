/**
 * GyneCRM — StatusBadge
 * Phase 7.5 — Shared UI Components
 *
 * Maps backend status strings (from enums in 000_create_enums.js)
 * to color-coded badge variants. Falls back to gray for unknown values.
 *
 * Usage:
 *   <StatusBadge status="scheduled" />          → blue "Scheduled"
 *   <StatusBadge status="high_risk" />           → red "High Risk"
 *   <StatusBadge status="paid" />               → green "Paid"
 *   <StatusBadge status={row.status} size="sm"/> → sized variant
 *
 * Dot-only mode (for table cells with tight space):
 *   <StatusBadge status="no_show" dot />
 */

import { cn } from '@utils';
import { STATUS_COLORS } from '@constants';

// ── Size variants ─────────────────────────────────────────────────────────────
const SIZES = {
  sm: 'px-1.5 py-0 text-2xs gap-1',
  md: 'px-2.5 py-0.5 text-xs gap-1.5',
  lg: 'px-3 py-1 text-sm gap-2',
};

export function StatusBadge({ status, size = 'md', dot = false, className }) {
  const config  = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
  const sizecls = SIZES[size] ?? SIZES.md;

  if (dot) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5', className)}
        title={config.label}
      >
        <span className={cn('w-2 h-2 rounded-full shrink-0', config.bg.replace('bg-', 'bg-').replace('-100', '-500'))} />
        <span className={cn('text-xs', config.text)}>{config.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bg,
        config.text,
        sizecls,
        className,
      )}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Role badge — maps role string to styled badge.
 * Used in sidebar, user tables, auth context display.
 */
export function RoleBadge({ role, className }) {
  const ROLE_CONFIG = {
    admin:        { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Administrator' },
    doctor:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Doctor' },
    receptionist: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Receptionist' },
    staff:        { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Staff' },
  };
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.staff;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        cfg.bg, cfg.text, className,
      )}
    >
      {cfg.label}
    </span>
  );
}
