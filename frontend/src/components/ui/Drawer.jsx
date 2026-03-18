/**
 * GyneCRM — Drawer
 * Phase 7.5 — Shared UI Components
 *
 * Right-side slide-in panel for non-navigating forms and quick views.
 * Used for: patient quick view, appointment form, document preview.
 *
 * Usage:
 *   <Drawer
 *     open={isOpen}
 *     onClose={() => setOpen(false)}
 *     title="New appointment"
 *     footer={<Button onClick={submit}>Save</Button>}
 *   >
 *     <AppointmentForm />
 *   </Drawer>
 */

import { useEffect, useRef } from 'react';
import { cn } from '@utils';
import { Button } from './Button';

// Width variants
const WIDTH_MAP = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
  preventClose = false,
  className,
}) {
  const panelRef = useRef(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape' && !preventClose) onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, preventClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => panelRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        aria-hidden="true"
        onClick={preventClose ? undefined : onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
        className={cn(
          'drawer-panel outline-none',
          WIDTH_MAP[width] ?? WIDTH_MAP.md,
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            {title && (
              <h2 id="drawer-title" className="text-base font-semibold text-content-primary">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-content-tertiary mt-0.5">{description}</p>
            )}
          </div>
          {!preventClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-content-disabled hover:text-content-secondary transition-colors rounded-lg p-1 hover:bg-surface-subtle ml-4 shrink-0"
              aria-label="Close panel"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-surface-border bg-surface-muted">
            <div className="flex items-center justify-end gap-3">
              {footer}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
