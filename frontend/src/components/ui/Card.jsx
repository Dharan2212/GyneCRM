/**
 * GyneCRM — Card
 * Phase 7.5 — Shared UI Components
 *
 * White surface container with shadow, radius, and optional sections.
 *
 * Usage:
 *   <Card>Simple content</Card>
 *   <Card padding="sm">Compact</Card>
 *   <Card header={<h2>Title</h2>} footer={<Button>Save</Button>}>Body</Card>
 *   <Card title="Patient Info" subtitle="Last visit: 3 Jan" action={<Button size="sm">Edit</Button>}>…</Card>
 */

import { cn } from '@utils';

// ── Padding variants ──────────────────────────────────────────────────────────
const PADDING = {
  none: '',
  xs:   'p-3',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function Card({
  // Convenience shorthand props
  title,
  subtitle,
  action,
  // Slot props
  header,
  footer,
  children,
  // Styling
  padding = 'md',
  hoverable = false,
  className,
  bodyClassName,
  // HTML
  as: Tag = 'div',
  ...rest
}) {
  const hasSyntheticHeader = title || subtitle || action;
  const hasHeader = header || hasSyntheticHeader;

  return (
    <Tag
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden',
        hoverable && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
        !hasHeader && !footer ? PADDING[padding] ?? PADDING.md : '',
        className,
      )}
      {...rest}
    >
      {/* Header */}
      {hasHeader && (
        <div className={cn('flex items-center justify-between gap-4 border-b border-surface-border', PADDING[padding] ?? PADDING.md)}>
          {hasSyntheticHeader ? (
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-content-primary leading-5 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-content-tertiary mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          ) : (
            header
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Body */}
      <div className={cn(hasHeader || footer ? (PADDING[padding] ?? PADDING.md) : '', bodyClassName)}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={cn('border-t border-surface-border bg-surface-muted', PADDING[padding] ?? PADDING.md)}>
          {footer}
        </div>
      )}
    </Tag>
  );
}

/**
 * CardGrid — responsive grid wrapper for cards.
 */
export function CardGrid({ cols = 2, gap = 4, children, className }) {
  const colMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={cn('grid', `gap-${gap}`, colMap[cols] ?? colMap[2], className)}>
      {children}
    </div>
  );
}
