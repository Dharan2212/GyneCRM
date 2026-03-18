/**
 * GyneCRM — Modal
 * Phase 7.5 — Shared UI Components
 *
 * Centered overlay modal. Closes on Escape (unless preventClose).
 * Closes on overlay click (unless preventClose).
 * Portal-free — renders inside React tree for simplicity (React Router v6 compatible).
 *
 * Usage:
 *   <Modal open={isOpen} onClose={() => setOpen(false)} title="Edit patient">
 *     <PatientForm />
 *   </Modal>
 *
 *   // With footer:
 *   <Modal
 *     open={open}
 *     onClose={onClose}
 *     title="Reschedule appointment"
 *     footer={
 *       <>
 *         <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *         <Button variant="primary" loading={isSaving} onClick={save}>Save</Button>
 *       </>
 *     }
 *   >
 *     <RescheduleForm />
 *   </Modal>
 */

import { useEffect, useRef } from 'react';
import { cn } from '@utils';

// ── Size map ──────────────────────────────────────────────────────────────────
const SIZE_MAP = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
  full:'max-w-[95vw]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
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

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus panel for keyboard users
      setTimeout(() => panelRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
      onClick={preventClose ? undefined : (e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn('modal-panel w-full outline-none', SIZE_MAP[size] ?? SIZE_MAP.md, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || !preventClose) && (
          <div className="modal-header">
            <div>
              {title && (
                <h2 id="modal-title" className="text-base font-semibold text-content-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-desc" className="text-sm text-content-tertiary mt-0.5">{description}</p>
              )}
            </div>
            {!preventClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-content-disabled hover:text-content-secondary transition-colors rounded-lg p-1 hover:bg-surface-subtle"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body overflow-y-auto max-h-[60vh]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer">
            <div className="flex items-center gap-3 justify-end w-full">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
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
