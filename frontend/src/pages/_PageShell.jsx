/**
 * GyneCRM — Page Shell Utility (internal, not exported as a route)
 * Phase 7.3 — Role-Based Routing
 *
 * Minimal placeholder shell used by all Phase 7.3 stub pages.
 * Phase 8 replaces each page's JSX body — this shell is not imported
 * from outside the pages directory.
 */

import { useAuth } from '@hooks/useAuth';
import { ROLE_LABELS } from '@constants';

const ROLE_COLORS = {
  admin:        'badge-purple',
  doctor:       'badge-blue',
  receptionist: 'badge-green',
  staff:        'badge-gray',
};

const MODULE_ICONS = {
  Dashboard:        '⬛',
  Analytics:        '📊',
  Users:            '👥',
  Settings:         '⚙️',
  Notifications:    '🔔',
  'Audit Log':      '📋',
  Waitlist:         '📝',
  Appointments:     '📅',
  Patients:         '🏥',
  Consultations:    '💊',
  Pregnancies:      '💗',
  'Document Review':'📄',
  Queue:            '🔢',
  Billing:          '💳',
  Documents:        '📁',
  'Patient Profile':'👤',
};

/**
 * Reusable shell for Phase 7.3 stub pages.
 * Replaced by real content in Phase 8.
 *
 * @param {{ title: string, roleLabel: string, path: string, description: string }} props
 */
export function PageShell({ title, roleLabel, path, description }) {
  const { role } = useAuth();
  const badgeClass = ROLE_COLORS[role] || 'badge-gray';
  const icon = MODULE_ICONS[title] || '📄';

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
      <div className="card max-w-lg w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-content-primary">{title}</h1>
              <p className="text-xs text-content-tertiary mt-0.5">{path}</p>
            </div>
          </div>
          <span className={`badge ${badgeClass}`}>
            {roleLabel || ROLE_LABELS[role] || role}
          </span>
        </div>

        <div className="divider" />

        {/* Description */}
        <p className="text-sm text-content-secondary mb-5">{description}</p>

        {/* Phase 8 notice */}
        <div className="flex items-center gap-3 bg-primary-50 rounded-xl p-4 border border-primary-100">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-700">Phase 8 — Frontend Modules</p>
            <p className="text-xs text-primary-600 mt-0.5">
              Full screen implementation is built in Phase 8.
              Route, role guard, and navigation are ready.
            </p>
          </div>
        </div>

        <p className="text-xs text-content-disabled text-center mt-4">
          Route active · Auth guard enforced · Phase 7.3
        </p>
      </div>
    </div>
  );
}
