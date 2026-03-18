/**
 * GyneCRM — AnalyticsCard
 * Phase 7.5 — Shared UI Components
 *
 * KPI metric card used on all dashboards (admin, doctor, reception).
 *
 * Usage:
 *   <AnalyticsCard
 *     title="Today's appointments"
 *     value={42}
 *     trend={{ value: 12, dir: 'up', label: 'vs last week' }}
 *     icon={<CalendarIcon />}
 *     iconColor="primary"
 *     loading={isFetching}
 *     footer="8 remaining"
 *   />
 */

import { cn, formatNumber } from '@utils';
import { Spinner } from './Spinner';

// Icon background color map
const ICON_BG = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  danger:  'bg-danger-50 text-danger-600',
  warning: 'bg-warning-50 text-warning-600',
  info:    'bg-info-50 text-info-600',
  purple:  'bg-purple-50 text-purple-600',
};

export function AnalyticsCard({
  title,
  value,
  trend,      // { value: number, dir: 'up'|'down'|'neutral', label?: string }
  icon,
  iconColor = 'primary',
  loading = false,
  footer,
  onClick,
  className,
}) {
  return (
    <div
      className={cn(
        'analytics-card',
        onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <div className="flex-1 min-w-0">
        {/* Label */}
        <p className="analytics-label">{title}</p>

        {/* Value */}
        <div className="mt-2 flex items-end gap-2">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <p className="analytics-value">
              {typeof value === 'number' ? formatNumber(value) : (value ?? '—')}
            </p>
          )}
        </div>

        {/* Trend */}
        {trend && !loading && (
          <TrendBadge trend={trend} />
        )}

        {/* Footer text */}
        {footer && !loading && (
          <p className="text-xs text-content-tertiary mt-2">{footer}</p>
        )}
      </div>

      {/* Icon */}
      {icon && (
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-4',
          ICON_BG[iconColor] ?? ICON_BG.primary,
        )}>
          <span className="w-5 h-5">{icon}</span>
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }) {
  const isUp      = trend.dir === 'up';
  const isDown    = trend.dir === 'down';
  const isNeutral = trend.dir === 'neutral';

  return (
    <div className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold mt-1.5',
      isUp      && 'text-success-600',
      isDown    && 'text-danger-600',
      isNeutral && 'text-content-tertiary',
    )}>
      {isUp   && <ArrowUpIcon />}
      {isDown && <ArrowDownIcon />}
      <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
      {trend.label && (
        <span className="text-content-tertiary font-normal ml-0.5">{trend.label}</span>
      )}
    </div>
  );
}

function ArrowUpIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
}
function ArrowDownIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
}
