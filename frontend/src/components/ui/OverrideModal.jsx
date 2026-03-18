/**
 * GyneCRM — OverrideModal
 * Phase 7.5 — Shared UI Components
 *
 * Specialized for override + audit workflows. Architecture-locked:
 * every data override (status change, billing edit, schedule change)
 * that bypasses normal flow must record an override reason in override_logs.
 *
 * Features:
 *   - Old value vs new value display (clinical clarity)
 *   - Required reason field (min 10 characters — stronger than ConfirmModal)
 *   - Optional note field for additional context
 *   - Escape DISABLED (preventClose=true — must actively click Cancel)
 *   - Visual serious-tone treatment
 *
 * Usage:
 *   <OverrideModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={({ reason, note }) => submitOverride({ reason, note })}
 *     loading={isSubmitting}
 *     title="Override appointment status"
 *     field="Status"
 *     oldValue="Scheduled"
 *     newValue="Completed"
 *     description="This will mark the appointment as completed without the patient checking out normally."
 *   />
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@utils';

const MIN_REASON_LENGTH = 10;

export function OverrideModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  // Content
  title = 'Override required',
  description,
  field,
  oldValue,
  newValue,
  // Form labels
  reasonLabel = 'Override reason',
  reasonPlaceholder = 'Explain why this override is necessary…',
  noteLabel = 'Additional note (optional)',
  notePlaceholder = 'Any additional context for the audit log…',
  showNote = false,
}) {
  const [reason, setReason] = useState('');
  const [note,   setNote]   = useState('');
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  function handleConfirm() {
    if (!reasonValid) return;
    onConfirm?.({ reason: reason.trim(), note: note.trim() || undefined });
  }

  function handleClose() {
    setReason('');
    setNote('');
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      preventClose  /* Escape disabled for override flows */
      title={title}
      description={description}
    >
      <div className="space-y-5">
        {/* Override summary: old → new */}
        {(oldValue !== undefined || newValue !== undefined) && (
          <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
            {field && (
              <p className="text-xs font-semibold text-content-tertiary uppercase tracking-wide mb-3">
                {field}
              </p>
            )}
            <div className="flex items-center gap-3">
              {/* Old value */}
              <div className="flex-1 min-w-0 text-center">
                <p className="text-2xs text-content-tertiary mb-1 font-medium uppercase tracking-wide">Before</p>
                <div className="rounded-lg bg-danger-50 border border-danger-200 px-3 py-2">
                  <p className="text-sm font-semibold text-danger-700 truncate">
                    {oldValue ?? '—'}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <span className="text-content-disabled shrink-0 text-lg">→</span>

              {/* New value */}
              <div className="flex-1 min-w-0 text-center">
                <p className="text-2xs text-content-tertiary mb-1 font-medium uppercase tracking-wide">After</p>
                <div className="rounded-lg bg-primary-50 border border-primary-200 px-3 py-2">
                  <p className="text-sm font-semibold text-primary-700 truncate">
                    {newValue ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit warning banner */}
        <div className="flex items-start gap-3 rounded-xl bg-warning-50 border border-warning-200 px-4 py-3">
          <AuditIcon />
          <p className="text-xs text-warning-700 leading-relaxed">
            This override will be recorded in the audit log with your name, timestamp, and reason.
          </p>
        </div>

        {/* Reason field — required */}
        <div className="form-group">
          <label className="form-label form-label-required">{reasonLabel}</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            className={cn('input-base resize-none', !reasonValid && reason.length > 0 && 'input-error')}
            aria-required="true"
            aria-describedby="override-reason-hint"
          />
          <p
            id="override-reason-hint"
            className={cn(
              'text-xs mt-1 flex items-center justify-between',
              !reasonValid && reason.length > 0
                ? 'text-danger-600'
                : 'text-content-tertiary',
            )}
          >
            <span>Minimum {MIN_REASON_LENGTH} characters required.</span>
            <span className={reason.length >= MIN_REASON_LENGTH ? 'text-success-600' : ''}>
              {reason.length}
            </span>
          </p>
        </div>

        {/* Optional note */}
        {showNote && (
          <div className="form-group">
            <label className="form-label">{noteLabel}</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="input-base resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            loading={loading}
            disabled={!reasonValid}
          >
            Confirm Override
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AuditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-0.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
