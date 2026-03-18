/**
 * GyneCRM — Auth Context
 * Phase 7.2 — Authentication Infrastructure
 *
 * SECURITY CONTRACT (architecture-locked):
 *   - accessToken is stored in React STATE only — never DOM, never storage
 *   - refreshToken is httpOnly cookie — this file never touches it
 *   - On every app mount: attempt silent refresh to restore session
 *   - configureApiClient() is called once to wire the token getter
 *     and the unauthorised callback into the Axios interceptor
 *
 * STATE SHAPE:
 *   user          — { id, name, email, role, hospitalId, branchId } | null
 *   accessToken   — string | null  (in-memory only)
 *   isAuthenticated — boolean
 *   isLoading     — boolean  (true during initial session restore)
 *   error         — string | null  (last login/refresh error message)
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { configureApiClient } from '@services/apiClient';
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from '@services/authService';
import { extractApiError } from '@utils';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
AuthContext.displayName = 'AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  user:            null,   // { id, name, email, role, hospitalId, branchId }
  accessToken:     null,   // JWT string — in memory only
  isAuthenticated: false,
  isLoading:       true,   // true until silent refresh resolves
  error:           null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // Ref provides synchronous access to the current token for the Axios
  // getter callback — avoids stale closure issues inside the interceptor.
  const tokenRef = useRef(null);

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Persist auth state after a successful login or refresh.
   * Updates both React state and the synchronous ref.
   *
   * @param {{ user: object, accessToken: string }} payload
   */
  const _setAuthenticated = useCallback(({ user, accessToken }) => {
    tokenRef.current = accessToken;
    setState({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Clear all auth state (logout / refresh failure).
   */
  const _clearAuth = useCallback(() => {
    tokenRef.current = null;
    setState({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,
    });
  }, []);

  // ── Wire apiClient once on mount ────────────────────────────────────────

  useEffect(() => {
    // 1. Give apiClient a synchronous getter for the live in-memory token.
    // 2. Give apiClient an unauthorised callback — called when refresh fails.
    configureApiClient(
      () => tokenRef.current,
      () => _clearAuth(),
    );

    // Expose a token-update callback on window so the interceptor can
    // push a refreshed token back into React state without a circular import.
    window.__gynecrm_onTokenRefreshed = (newToken) => {
      tokenRef.current = newToken;
      setState((prev) => ({
        ...prev,
        accessToken: newToken,
      }));
    };

    return () => {
      delete window.__gynecrm_onTokenRefreshed;
    };
  }, [_clearAuth]);

  // ── Silent session restore on mount ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        // POST /api/v1/auth/refresh — reads httpOnly cookie automatically
        const data = await apiRefresh();

        if (cancelled) return;

        // Backend may return { accessToken, user } or just { accessToken }
        // When only accessToken is returned we keep user as null until
        // a profile call is added in Phase 8.
        if (data?.accessToken) {
          _setAuthenticated({
            user:        data.user  || null,
            accessToken: data.accessToken,
          });
        } else {
          _clearAuth();
        }
      } catch {
        if (cancelled) return;
        // Refresh failed (no valid cookie / expired) → stay logged out
        _clearAuth();
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [_setAuthenticated, _clearAuth]);

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Log in with email + password.
   *
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<void>}
   * @throws — rethrows on failure so the login form can display the error
   */
  const login = useCallback(
    async (credentials) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await apiLogin(credentials);
        // data = { accessToken, user: { id, name, email, role, hospitalId, branchId } }
        _setAuthenticated({
          user:        data.user,
          accessToken: data.accessToken,
        });
      } catch (err) {
        const message = extractApiError(err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw err; // re-throw so LoginPage can react
      }
    },
    [_setAuthenticated],
  );

  /**
   * Log out the current user.
   * Calls backend (best-effort), then clears local state.
   */
  const logout = useCallback(async () => {
    await apiLogout(); // best-effort — clears cookie server-side
    _clearAuth();
  }, [_clearAuth]);

  /**
   * Manually set auth state — used by the apiClient interceptor's token
   * refresh callback (window.__gynecrm_onTokenRefreshed) and any future
   * SSO / deep-link scenarios.
   */
  const setAuthState = useCallback(
    (updates) => {
      if (updates.accessToken !== undefined) {
        tokenRef.current = updates.accessToken;
      }
      setState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // ── Context value — memoized to prevent unnecessary re-renders ──────────

  const value = useMemo(
    () => ({
      // ── State ────────────────────────────────────────────────────
      user:            state.user,
      role:            state.user?.role    ?? null,
      hospitalId:      state.user?.hospitalId ?? null,
      branchId:        state.user?.branchId   ?? null,
      accessToken:     state.accessToken,
      isAuthenticated: state.isAuthenticated,
      isLoading:       state.isLoading,
      error:           state.error,

      // ── Actions ──────────────────────────────────────────────────
      login,
      logout,
      setAuthState,
    }),
    [state, login, logout, setAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
