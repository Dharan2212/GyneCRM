/**
 * GyneCRM — ToastViewport
 * Phase 7.5 — Shared UI Components
 *
 * Renders the react-hot-toast <Toaster /> with GyneCRM design system styles.
 * Mounted once in App.jsx — inside RouterProvider so toasts appear over all routes.
 *
 * Toast usage anywhere in the app:
 *   import toast from 'react-hot-toast';
 *
 *   toast.success('Patient registered successfully');
 *   toast.error('Failed to save appointment');
 *   toast('Appointment rescheduled');
 *   toast.loading('Generating PDF…');
 *
 * Position: top-right (non-intrusive for hospital staff workflows).
 * Duration: 4 seconds (long enough to read, short enough not to pile up).
 */

import { Toaster } from 'react-hot-toast';

export function ToastViewport() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 20,
        right: 20,
        zIndex: 9999,
      }}
      toastOptions={{
        // ── Global defaults ─────────────────────────────────────────────
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#111827',
          fontSize: '0.875rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '500',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.08)',
          padding: '12px 16px',
          maxWidth: '380px',
          lineHeight: '1.4',
        },

        // ── Success ──────────────────────────────────────────────────────
        success: {
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#111827',
          },
          iconTheme: {
            primary: '#22c55e',   // success-500
            secondary: '#ffffff',
          },
        },

        // ── Error ────────────────────────────────────────────────────────
        error: {
          duration: 5000,        // longer — staff need to read errors
          style: {
            background: '#ffffff',
            color: '#111827',
            borderColor: '#fecaca',  // danger-200 tint
          },
          iconTheme: {
            primary: '#ef4444',  // danger-500
            secondary: '#ffffff',
          },
        },

        // ── Loading ──────────────────────────────────────────────────────
        loading: {
          duration: Infinity,    // loading toasts must be dismissed programmatically
          style: {
            background: '#ffffff',
            color: '#374151',
          },
          iconTheme: {
            primary: '#0D7E8A',  // primary-500
            secondary: '#f0fdfc',
          },
        },
      }}
    />
  );
}

/**
 * Convenience wrappers — typed toast helpers for GyneCRM contexts.
 * Import these instead of calling toast() directly for consistent messaging.
 *
 * Usage:
 *   import { notify } from '@components/ui/ToastViewport';
 *   notify.saved('Patient');
 *   notify.deleted('Appointment');
 *   notify.error('Failed to load billing data');
 *   notify.loading('pdf', toastId);
 *   notify.dismiss(toastId);
 */
import toast from 'react-hot-toast';

export const notify = {
  /** Generic success */
  success: (msg) => toast.success(msg),

  /** Generic error */
  error: (msg) => toast.error(msg),

  /** Generic info */
  info: (msg) => toast(msg, {
    icon: (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8',
        fontSize: 11, fontWeight: 700,
      }}>i</span>
    ),
  }),

  /** Saved confirmation — e.g. notify.saved('Appointment') */
  saved: (entity) => toast.success(`${entity} saved successfully`),

  /** Deleted confirmation — e.g. notify.deleted('Invoice') */
  deleted: (entity) => toast.success(`${entity} deleted`),

  /** Loading — returns toast ID for programmatic dismiss */
  loading: (msg) => toast.loading(msg),

  /** Dismiss a specific toast by ID */
  dismiss: (id) => toast.dismiss(id),

  /** Dismiss all toasts */
  dismissAll: () => toast.dismiss(),

  /**
   * Promise-based toast — wraps an async operation.
   * toast.promise(apiCall(), { loading: '…', success: '✓', error: 'Failed' })
   */
  promise: toast.promise,
};
