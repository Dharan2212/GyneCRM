/**
 * GyneCRM — useAuth Hook
 * Phase 7.2 — Authentication Infrastructure
 *
 * Thin wrapper around AuthContext.
 * Throws a descriptive error if used outside AuthProvider — catches
 * misuse early in development.
 *
 * Usage:
 *   const { user, role, isAuthenticated, isLoading, login, logout } = useAuth();
 */

import { useContext } from 'react';
import { AuthContext } from '@context/AuthContext';

/**
 * @returns {{
 *   user:            { id: string, name: string, email: string, role: string, hospitalId: string, branchId: string|null } | null,
 *   role:            'admin'|'doctor'|'receptionist'|'staff'|null,
 *   hospitalId:      string|null,
 *   branchId:        string|null,
 *   accessToken:     string|null,
 *   isAuthenticated: boolean,
 *   isLoading:       boolean,
 *   error:           string|null,
 *   login:           (credentials: { email: string, password: string }) => Promise<void>,
 *   logout:          () => Promise<void>,
 *   setAuthState:    (updates: object) => void,
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error(
      '[useAuth] must be used inside <AuthProvider>. ' +
        'Ensure AuthProvider wraps your component tree in src/app/App.jsx.',
    );
  }

  return context;
}
