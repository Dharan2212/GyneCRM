/**
 * GyneCRM — 404 Not Found Page
 * Phase 7.3 — Role-Based Routing
 *
 * Shown for all unmatched routes (path="*").
 * Redirects authenticated users to their own dashboard.
 * Redirects unauthenticated users to /login.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ROLE_DASHBOARD_PATHS } from '@constants';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  function handleGoBack() {
    if (isAuthenticated && role) {
      navigate(ROLE_DASHBOARD_PATHS[role] ?? '/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">

        {/* Brand mark */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg">
            <svg
              width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
        </div>

        {/* 404 number */}
        <div className="mb-2">
          <span
            className="text-8xl font-extrabold text-primary-100 select-none leading-none"
            aria-hidden="true"
          >
            404
          </span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-content-primary mb-2">
          Page not found
        </h1>
        <p className="text-sm text-content-tertiary mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or you may not have
          permission to access it.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleGoBack}
          className="btn-primary w-full mb-3"
        >
          {isAuthenticated ? 'Back to my dashboard' : 'Go to login'}
        </button>

        {/* Path hint */}
        <p className="text-xs text-content-disabled">
          If you believe this is an error, contact your system administrator.
        </p>
      </div>
    </div>
  );
}
