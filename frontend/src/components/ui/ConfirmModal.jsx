/**
 * GyneCRM — ConfirmModal
 * Phase 7.5 — Shared UI Components
 *
 * Two-step safety modal for destructive or consequential actions.
 * Optional reason field for audit trail support.
 *
 * Usage:
 *   <ConfirmModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     loading={isDeleting}
 *     title="Cancel appointment?"
 *     description="This will notify the patient and cannot be undone."
 *     confirmLabel="Cancel appointment"
 *     variant="danger"
 *     requireReason
 *     reasonLabel="Reason for cancellation"
 *   />
 */

import { useState } from 'react';
import { cn } from '@utils';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  // Text
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  // Variant
  variant = 'danger',      // 'danger' | 'warning' | 'primary'
  // Reason field
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason…',
  minReasonLength = 5,
}) {
  const [reason, setReason] = useState('');
  const reasonTooShort = requireReason && reason.trim().length < minReasonLength;

  function handleConfirm() {
    if (reasonTooShort) return;
    onConfirm?.(reason.trim() || undefined);
  }

  function handleClose() {
    setReason('');
    onClose?.();
  }

  const ICON_CONFIG = {
    danger:  { bg: 'bg-danger-50',  icon: 'text-danger-500',  btn: 'danger' },
    warning: { bg: 'bg-warning-50', icon: 'text-warning-500', btn: 'primary' },
    primary: { bg: 'bg-primary-50', icon: 'text-primary-500', btn: 'primary' },
  };
  const cfg = ICON_CONFIG[variant] ?? ICON_CONFIG.danger;

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', cfg.bg)}>
          <WarningIcon className={cfg.icon} />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-base font-semibold text-content-primary">{title}</h2>
          {description && (
            <p className="text-sm text-content-tertiary mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Optional reason field */}
        {requireReason && (
          <div className="w-full text-left">
            <label className="form-label mb-1.5 block form-label-required">{reasonLabel}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="input-base resize-none text-sm"
              aria-required="true"
            />
            {reasonTooShort && reason.length > 0 && (
              <p className="input-error-text mt-1 text-xs">
                Minimum {minReasonLength} characters required
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={cfg.btn}
            className="flex-1"
            onClick={handleConfirm}
            loading={loading}
            disabled={reasonTooShort}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function WarningIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
