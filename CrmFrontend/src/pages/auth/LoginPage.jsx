import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext.jsx'
import { C } from '../../crm/data.js'
import { S } from '../../crm/styles.js'
import { LoadingButton } from '../../modules/shared/ui/form/index.js'
import { API_BASE_URL } from '../../lib/api/config.js'
import { resolvePostLoginPath } from '../../modules/auth/auth.redirects.js'

const initialForm = {
  email: '',
  password: '',
}

const initialTouched = {
  email: false,
  password: false,
}

function validateEmail(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return 'Email is required.'
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalized)) {
    return 'Enter a valid email address.'
  }

  return ''
}

function validatePassword(value) {
  const normalized = String(value || '')

  if (!normalized) {
    return 'Password is required.'
  }

  if (normalized.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  return ''
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState(initialTouched)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const notice = useMemo(() => location.state?.notice || '', [location.state])

  const fieldErrors = {
    email: validateEmail(form.email),
    password: validatePassword(form.password),
  }

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const onBlur = (event) => {
    const { name } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setTouched({ email: true, password: true })

    if (fieldErrors.email || fieldErrors.password) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const session = await login({
        email: form.email.trim(),
        password: form.password,
      })

      navigate(resolvePostLoginPath(session.user, location.state), { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(180deg, ${C.bg}, #eef4ff)`,
        padding: 24,
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 980,
          display: 'grid',
          gridTemplateColumns: '1.1fr .9fr',
          border: `1.5px solid ${C.bd}`,
          borderRadius: 28,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 22px 56px rgba(22, 44, 86, 0.10)',
        }}
      >
        <div
          style={{
            padding: 40,
            background: `linear-gradient(145deg, ${C.m}, ${C.mB})`,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.8 }}>
              GyneCRM Secure Access
            </div>
            <h1 style={{ fontSize: 34, lineHeight: 1.15, marginTop: 14, marginBottom: 14 }}>
              Login and session contract is connected to the verified backend.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.92, maxWidth: 440 }}>
              Sign in with your verified backend credentials. Session restore, logout, change-password,
              and role-safe CRM entry remain aligned with the current protected route contract.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: 18,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>Backend session contract</div>
            <div style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.9 }}>
              API base: <strong>{API_BASE_URL}</strong>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.9 }}>
              Login returns bearer <strong>access_token</strong> and the backend keeps refresh continuation in an
              <strong> httpOnly cookie</strong>.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.9 }}>
              Protected role areas: <strong>/crm/doctor/*</strong>, <strong>/crm/receptionist/*</strong>, and <strong>/crm/admin/*</strong>.
            </div>
          </div>
        </div>

        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: C.kS, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Role-aware sign in
            </div>
            <h2 style={{ fontSize: 28, marginTop: 10, color: C.k }}>Welcome back</h2>
            <p style={{ marginTop: 8, color: C.kS, fontSize: 14, lineHeight: 1.7 }}>
              After sign-in, GyneCRM sends you either to the route you originally requested or to your safe role home.
            </p>
          </div>

          {notice ? (
            <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: '#f1f8ff', color: '#12507d', fontSize: 13, lineHeight: 1.6 }}>
              {notice}
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: '#fff3f2', color: '#b42318', fontSize: 13, lineHeight: 1.6 }}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, color: C.kB, marginBottom: 6 }}>Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="name@hospital.com"
                style={{ ...S.inp, borderColor: touched.email && fieldErrors.email ? '#f0b4ad' : undefined }}
                aria-invalid={Boolean(touched.email && fieldErrors.email)}
                required
              />
              {touched.email && fieldErrors.email ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#b42318' }}>{fieldErrors.email}</div>
              ) : null}
            </div>

            <div>
              <label htmlFor="login-password" style={{ display: 'block', fontSize: 12, color: C.kB, marginBottom: 6 }}>Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="Enter your password"
                style={{ ...S.inp, borderColor: touched.password && fieldErrors.password ? '#f0b4ad' : undefined }}
                aria-invalid={Boolean(touched.password && fieldErrors.password)}
                minLength={8}
                required
              />
              {touched.password && fieldErrors.password ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#b42318' }}>{fieldErrors.password}</div>
              ) : null}
            </div>

            <LoadingButton
              type="submit"
              loading={submitting}
              label="Login to CRM"
              loadingLabel="Signing in..."
              style={{ justifyContent: 'center', width: '100%', height: 46, borderRadius: 14, marginTop: 4 }}
            />
          </form>

          <div style={{ marginTop: 18, fontSize: 12, color: C.kS, lineHeight: 1.7 }}>
            Website remains public at <Link to="/" style={{ color: C.m, fontWeight: 600 }}>/</Link>. CRM access is protected by the backend auth and refresh-session flow.
          </div>
        </div>
      </div>
    </div>
  )
}
