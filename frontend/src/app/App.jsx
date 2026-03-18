/**
 * GyneCRM — App Root
 * Phase 7.2 — Authentication Infrastructure wired.
 *
 * Provider order (outer → inner):
 *   1. QueryProvider   — TanStack Query cache (must be outermost data layer)
 *   2. AuthProvider    — session state, configures Axios interceptors
 *   3. AppRouterPlaceholder — replaced by real router in Batch 7.3
 *
 * Batch 7.3 will replace <AppRouterPlaceholder> with <RouterProvider>.
 * Batch 7.6 will add <Toaster /> from react-hot-toast to this file.
 */

import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '@context/AuthContext';
import { useAuth } from '@hooks/useAuth';
import { router } from '@routes/index';
import { ToastViewport } from '@components/ui/ToastViewport';

// ─────────────────────────────────────────────────────────────────────────────
// Temporary inner component — replaced in Batch 7.3
// Displays auth state to confirm the infrastructure is working.
// ─────────────────────────────────────────────────────────────────────────────
function AppRouterPlaceholder() {
  const { isLoading, isAuthenticated, user, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="card max-w-sm w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="font-semibold text-content-primary">GyneCRM</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-content-tertiary">
            <span className="spinner w-4 h-4 text-primary-500" />
            Restoring session…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-content-primary">GyneCRM</h1>
            <p className="text-xs text-content-tertiary">Hospital CRM & Automation</p>
          </div>
        </div>

        <div className="divider" />

        {/* Phase completion status */}
        <p className="section-header mb-3">Phase 7 Progress</p>
        <div className="space-y-2.5">
          {[
            { label: 'Vite + React + Tailwind',               done: true  },
            { label: 'Design system tokens',                  done: true  },
            { label: 'Constants & API endpoints',             done: true  },
            { label: 'Axios client + interceptors',           done: true  },
            { label: 'AuthContext + session restore',         done: true  },
            { label: 'TanStack QueryClient',                  done: true  },
            { label: 'Routing + ProtectedRoute — Batch 7.3', done: false },
            { label: 'Form components — Batch 7.4',          done: false },
            { label: 'UI components — Batch 7.5',            done: false },
            { label: 'AppShell + Layouts — Batch 7.6',       done: false },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={done ? 'badge badge-green' : 'badge badge-yellow'}>
                {done ? '✓' : '◷'}
              </span>
              <span className="text-sm text-content-secondary">{label}</span>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Live auth state */}
        <p className="section-header mb-2">Auth State (Live)</p>
        <div className="bg-surface-subtle rounded-lg p-3 text-xs font-mono space-y-1 text-content-tertiary">
          <div>
            <span className="text-content-secondary font-semibold">isAuthenticated:</span>{' '}
            <span className={isAuthenticated ? 'text-success-600' : 'text-danger-600'}>
              {String(isAuthenticated)}
            </span>
          </div>
          <div>
            <span className="text-content-secondary font-semibold">isLoading:</span>{' '}
            {String(isLoading)}
          </div>
          <div>
            <span className="text-content-secondary font-semibold">role:</span>{' '}
            {role ?? 'null'}
          </div>
          <div>
            <span className="text-content-secondary font-semibold">user:</span>{' '}
            {user ? `${user.name} (${user.email})` : 'null'}
          </div>
        </div>

        <p className="text-xs text-content-disabled text-center mt-4">
          Phase 7.2 — Auth Infrastructure Complete
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Root
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRouterPlaceholder />
        <RouterProvider router={router} />
        <ToastViewport />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
