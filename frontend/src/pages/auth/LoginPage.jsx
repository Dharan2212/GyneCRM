/**
 * GyneCRM — Login Page
 * Phase 7.3 — Role-Based Routing
 *
 * Production-quality login screen.
 *
 * BEHAVIOUR:
 *   - On success: redirect to ?redirect param or role-based dashboard
 *   - On failure: display backend error message inline
 *   - Access token is NEVER stored in localStorage (AuthContext holds it in memory)
 *   - Form state managed with react-hook-form + Zod schema validation
 *   - Supports keyboard navigation (Tab, Enter to submit)
 *
 * BACKEND CONTRACT:
 *   POST /api/v1/auth/login
 *   Body:    { email, password }
 *   Success: { success: true, data: { accessToken, user: { role, ... } } }
 *   Error:   { success: false, message, errors: [{ code, field, detail }] }
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@hooks/useAuth';
import { ROLE_DASHBOARD_PATHS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// Validation schema (mirrors backend Joi validator)
// ─────────────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Inline error message below a field */
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="input-error-text" role="alert">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </p>
  );
}

/** Alert banner for backend-level errors (wrong credentials etc.) */
function AlertBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className="text-danger-600 shrink-0 mt-0.5" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p className="text-sm text-danger-700 font-medium">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, role } = useAuth();

  // Inline error state for backend auth failures (wrong credentials, etc.)
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // If somehow already authenticated, redirect immediately
  if (isAuthenticated && role) {
    const redirectTo =
      searchParams.get('redirect') || ROLE_DASHBOARD_PATHS[role] || '/';
    navigate(redirectTo, { replace: true });
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Form submit ───────────────────────────────────────────────────────────
  async function onSubmit({ email, password }) {
    setAuthError(null);

    try {
      await login({ email, password });

      // AuthContext has updated role — read from context after login
      // We re-read role from AuthContext via useAuth() but it won't update
      // in this closure synchronously. Use the redirect param or let App
      // re-render drive the navigation.
      const redirectTo = searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        navigate(redirectTo, { replace: true });
      }
      // If no redirect param, the router's RootRedirect will handle it
      // once isAuthenticated flips to true and the route re-evaluates.
    } catch (err) {
      // Backend error envelope: { errors: [{ code, field, detail }] }
      const backendErrors = err?.response?.data?.errors;
      const backendMessage = err?.response?.data?.message;

      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        // Map field-level errors back to form fields
        let hasFieldErrors = false;
        backendErrors.forEach(({ field, detail }) => {
          if (field === 'email' || field === 'password') {
            setError(field, { message: detail });
            hasFieldErrors = true;
          }
        });
        if (!hasFieldErrors) {
          setAuthError(backendMessage || backendErrors[0]?.detail || 'Login failed.');
        }
      } else {
        setAuthError(backendMessage || 'Unable to sign in. Please check your credentials.');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 flex items-center justify-center p-4">

      {/* Background texture overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), ' +
            'radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* ── Brand header ─────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl mb-4">
            <svg
              width="30" height="30" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">GyneCRM</h1>
          <p className="text-sm text-primary-300 mt-1">Hospital CRM & Automation System</p>
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Card top accent */}
          <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" aria-hidden="true" />

          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-content-primary">Sign in to your account</h2>
              <p className="text-sm text-content-tertiary mt-1">
                Enter your credentials to access the system.
              </p>
            </div>

            {/* Backend error alert */}
            <AlertBanner message={authError} />

            {/* ── Form ───────────────────────────────────────────────── */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5 mt-5"
            >
              {/* Email field */}
              <div className="form-group">
                <label htmlFor="email" className="form-label form-label-required">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="doctor@hospital.com"
                  className={`input-base ${errors.email ? 'input-error' : ''}`}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  disabled={isSubmitting}
                  {...register('email')}
                />
                <span id="email-error">
                  <FieldError message={errors.email?.message} />
                </span>
              </div>

              {/* Password field */}
              <div className="form-group">
                <label htmlFor="password" className="form-label form-label-required">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`input-base pr-11 ${errors.password ? 'input-error' : ''}`}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    disabled={isSubmitting}
                    {...register('password')}
                  />
                  {/* Toggle visibility */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-disabled hover:text-content-secondary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <span id="password-error">
                  <FieldError message={errors.password?.message} />
                </span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full btn-lg"
                aria-live="polite"
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner w-4 h-4 text-white/80" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Card footer */}
          <div className="px-8 py-4 bg-surface-muted border-t border-surface-border">
            <p className="text-xs text-content-tertiary text-center">
              Having trouble signing in?{' '}
              <span className="font-medium text-primary-600">
                Contact your system administrator.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-xs text-primary-400 mt-6">
          Secure access · All sessions are audited
        </p>
      </div>
    </div>
  );
}
