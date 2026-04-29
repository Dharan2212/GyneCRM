import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext.jsx'
import { C } from '../../crm/data.js'
import { S } from '../../crm/styles.js'
import { LoadingButton } from '../../modules/shared/ui/form/index.js'

const initialForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, changePassword } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirm password must match.')
      return
    }

    setSubmitting(true)

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })

      navigate('/crm/login', {
        replace: true,
        state: {
          notice: 'Password changed successfully. Please log in again.',
        },
      })
    } catch (submitError) {
      setError(submitError.message || 'Password change failed.')
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
          maxWidth: 520,
          borderRadius: 26,
          background: '#fff',
          border: `1.5px solid ${C.bd}`,
          boxShadow: '0 18px 48px rgba(22, 44, 86, 0.08)',
          padding: 34,
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: C.kS, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Account security
          </div>
          <h1 style={{ fontSize: 28, marginTop: 10, color: C.k }}>Change password</h1>
          <p style={{ marginTop: 8, color: C.kS, fontSize: 14, lineHeight: 1.7 }}>
            Signed in as <strong>{user?.full_name || user?.email}</strong>. On success, the backend clears the refresh session and you must log in again.
          </p>
        </div>

        {error ? (
          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: '#fff3f2', color: '#b42318', fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.kB, marginBottom: 6 }}>Current password</label>
            <input
              name="current_password"
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={onChange}
              style={S.inp}
              minLength={8}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.kB, marginBottom: 6 }}>New password</label>
            <input
              name="new_password"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={onChange}
              style={S.inp}
              minLength={8}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.kB, marginBottom: 6 }}>Confirm new password</label>
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={onChange}
              style={S.inp}
              minLength={8}
              required
            />
          </div>

          <LoadingButton
            type="submit"
            loading={submitting}
            label="Change password"
            loadingLabel="Updating password..."
            style={{ justifyContent: 'center', width: '100%', height: 46, borderRadius: 14, marginTop: 4 }}
          />
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: C.kS }}>
          <Link to="/crm" style={{ color: C.m, fontWeight: 600 }}>Back to CRM home</Link>
        </div>
      </div>
    </div>
  )
}
