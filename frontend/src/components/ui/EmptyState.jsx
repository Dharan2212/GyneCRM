/**
 * GyneCRM — EmptyState
 * Phase 7.5 — Shared UI Components
 *
 * Usage:
 *   <EmptyState
 *     title="No appointments today"
 *     description="Appointments will appear here once booked."
 *     action={<Button onClick={...}>Book appointment</Button>}
 *   />
 *
 *   <EmptyState icon={<SearchIcon />} title="No patients found" compact />
 */

import { cn } from '@utils';

// Built-in icon variants
const ICON_VARIANTS = {
  default:      <DefaultIcon />,
  search:       <SearchIcon />,
  documents:    <DocumentIcon />,
  appointments: <CalendarIcon />,
  billing:      <BillingIcon />,
  notifications:<BellIcon />,
};

export function EmptyState({
  icon,
  iconVariant = 'default',
  title = 'Nothing here yet',
  description,
  action,
  compact = false,
  className,
}) {
  const displayIcon = icon ?? ICON_VARIANTS[iconVariant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className,
      )}
    >
      {displayIcon && (
        <div className={cn(
          'rounded-2xl bg-surface-subtle flex items-center justify-center text-content-disabled mb-4',
          compact ? 'w-10 h-10' : 'w-14 h-14',
        )}>
          {displayIcon}
        </div>
      )}
      <h3 className={cn(
        'font-semibold text-content-secondary',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'text-content-tertiary mt-1 max-w-xs',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function DefaultIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}
function SearchIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function DocumentIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function CalendarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function BillingIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function BellIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
}
