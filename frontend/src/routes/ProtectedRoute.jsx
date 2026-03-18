/**
 * GyneCRM — ProtectedRoute
 * Phase 7.3 — Role-Based Routing
 *
 * Wraps any route tree that requires authentication.
 * Uses React Router v6 <Outlet /> pattern — parent renders guard,
 * children render when guard passes.
 *
 * BEHAVIOUR CONTRACT (architecture-locked):
 *   1. isLoading      → render full-screen loading skeleton
 *   2. !isAuthenticated → redirect to /login?redirect=<current_path>
 *   3. role not in allowedRoles → redirect to user's own dashboard root
 *   4. authenticated + correct role → render <Outlet />
 *
 * USAGE:
 *   // Single role
 *   <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *     <Route path="dashboard" element={<AdminDashboard />} />
 *   </Route>
 *
 *   // Multiple roles
 *   <Route element={<ProtectedRoute allowedRoles={['admin','doctor','receptionist','staff']} />}>
 *     <Route path="/patients/:id" element={<PatientProfile />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ROLE_DASHBOARD_PATHS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen loading state — shown while AuthContext is restoring session
// ─────────────────────────────────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <div
      className="min-h-screen bg-surface-muted flex flex-col items-center justify-center gap-4"
      aria-busy="true"
      aria-label="Verifying your session"
    >
      {/* Brand mark */}
      <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-content-tertiary font-medium">Verifying session…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ allowedRoles: string[] }} props
 */
export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  // ── 1. Session restore in progress ──────────────────────────────────────
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // ── 2. Not authenticated → redirect to login, preserve intended path ────
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // ── 3. Wrong role → redirect to user's own dashboard ────────────────────
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const ownDashboard = ROLE_DASHBOARD_PATHS[role] ?? '/login';
    return <Navigate to={ownDashboard} replace />;
  }

  // ── 4. Authenticated + correct role → render children ───────────────────
  return <Outlet />;
}
