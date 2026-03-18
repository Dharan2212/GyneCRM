/**
 * GyneCRM — Timeline
 * Phase 7.5 — Shared UI Components
 *
 * Vertical chronological timeline. Used for:
 *   - Patient activity history
 *   - Pregnancy milestones
 *   - Consultation/visit history
 *   - Notification/WhatsApp log
 *   - Audit log display
 *
 * Item shape:
 *   {
 *     id: string,
 *     date: string,          — ISO string or display string
 *     title: string,
 *     description?: string,
 *     meta?: string,         — e.g. doctor name, branch
 *     type?: 'default'|'success'|'warning'|'danger'|'info'|'purple',
 *     icon?: ReactNode,
 *     badge?: ReactNode,      — e.g. StatusBadge
 *   }
 *
 * Usage:
 *   <Timeline items={consultationHistory} />
 *   <Timeline items={auditLog} compact />
 */

import { cn } from '@utils';
import { formatDateTime, formatDate } from '@utils';

const TYPE_DOT = {
  default: 'bg-primary-500 border-primary-200',
  success: 'bg-success-500 border-success-200',
  warning: 'bg-warning-500 border-warning-200',
  danger:  'bg-danger-500 border-danger-200',
  info:    'bg-info-500 border-info-200',
  purple:  'bg-purple-500 border-purple-200',
  gray:    'bg-gray-400 border-gray-200',
};

export function Timeline({ items = [], compact = false, className }) {
  if (items.length === 0) return null;

  return (
    <ol className={cn('space-y-0', className)} aria-label="Timeline">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const dotCls = TYPE_DOT[item.type ?? 'default'] ?? TYPE_DOT.default;

        return (
          <li key={item.id ?? idx} className="timeline-item">
            {/* Vertical connector line */}
            {!isLast && <div className="timeline-line" aria-hidden="true" />}

            {/* Dot */}
            <div
              aria-hidden="true"
              className={cn(
                'timeline-dot border-2',
                dotCls,
                compact ? 'h-6 w-6' : 'h-7 w-7',
              )}
            >
              {item.icon ? (
                <span className="text-white w-3 h-3">{item.icon}</span>
              ) : null}
            </div>

            {/* Content */}
            <div className="timeline-content pb-6">
              {/* Date + badge row */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <time
                  dateTime={item.date}
                  className="text-xs text-content-tertiary font-medium whitespace-nowrap"
                >
                  {compact ? formatDate(item.date) : formatDateTime(item.date)}
                </time>
                {item.badge && <span className="shrink-0">{item.badge}</span>}
              </div>

              {/* Title */}
              <p className={cn(
                'font-semibold text-content-primary',
                compact ? 'text-xs' : 'text-sm',
              )}>
                {item.title}
              </p>

              {/* Description */}
              {item.description && (
                <p className={cn(
                  'text-content-secondary mt-0.5 leading-relaxed',
                  compact ? 'text-xs' : 'text-xs',
                )}>
                  {item.description}
                </p>
              )}

              {/* Meta */}
              {item.meta && (
                <p className="text-2xs text-content-disabled mt-1">{item.meta}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
