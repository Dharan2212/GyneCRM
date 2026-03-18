/**
 * GyneCRM — Tabs
 * Phase 7.5 — Shared UI Components
 *
 * Controlled tabs with accessible role structure.
 * Used for patient profile, consultation detail, settings panels.
 *
 * Usage (controlled):
 *   const [tab, setTab] = useState('info');
 *   <Tabs value={tab} onChange={setTab} tabs={[
 *     { value: 'info',    label: 'Patient Info' },
 *     { value: 'history', label: 'History' },
 *     { value: 'docs',    label: 'Documents', badge: 3 },
 *     { value: 'bills',   label: 'Billing', disabled: true },
 *   ]} />
 *
 *   {tab === 'info' && <PatientInfoPanel />}
 */

import { useRef } from 'react';
import { cn } from '@utils';

export function Tabs({ tabs = [], value, onChange, className }) {
  const listRef = useRef(null);

  // Keyboard: left/right arrows move between tabs
  function handleKeyDown(e) {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIdx  = enabledTabs.findIndex((t) => t.value === value);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = enabledTabs[(currentIdx + 1) % enabledTabs.length];
      if (next) onChange?.(next.value);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = enabledTabs[(currentIdx - 1 + enabledTabs.length) % enabledTabs.length];
      if (prev) onChange?.(prev.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange?.(enabledTabs[0]?.value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange?.(enabledTabs[enabledTabs.length - 1]?.value);
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Navigation tabs"
      className={cn('tabs-list overflow-x-auto', className)}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive   = tab.value === value;
        const isDisabled = tab.disabled;

        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            id={`tab-${tab.value}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            aria-disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange?.(tab.value)}
            className={cn(
              'tab-trigger',
              isActive   && 'tab-trigger-active',
              isDisabled && 'tab-trigger-disabled',
            )}
          >
            <span className="flex items-center gap-2">
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              {tab.label}
              {tab.badge != null && (
                <span className={cn(
                  'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-2xs font-bold',
                  isActive ? 'bg-primary-500 text-white' : 'bg-surface-border text-content-tertiary',
                )}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * TabPanel — content panel, shown when matching tab is active.
 */
export function TabPanel({ value, activeTab, children, className }) {
  if (value !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn('outline-none', className)}
    >
      {children}
    </div>
  );
}
