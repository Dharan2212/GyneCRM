import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext.jsx'
import { C } from '../../crm/data.js'
import { S } from '../../crm/styles.js'
import { getUserDisplayName, getUserRoleLabel } from '../../modules/rbac/roleIdentity.js'

export default function AdminHomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const goToChangePassword = () => {
    navigate('/crm/change-password')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/crm/login', { replace: true })
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
          maxWidth: 760,
          borderRadius: 28,
          background: '#fff',
          border: `1.5px solid ${C.bd}`,
          boxShadow: '0 18px 48px rgba(22, 44, 86, 0.08)',
          padding: 34,
        }}
      >
        <div style={{ color: C.kS, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Admin access verified
        </div>
        <h1 style={{ fontSize: 30, color: C.k, marginTop: 10 }}>Admin session is protected and routed.</h1>
        <p style={{ color: C.kS, marginTop: 10, fontSize: 14, lineHeight: 1.8, maxWidth: 620 }}>
          Batch 1.1 establishes backend-authenticated entry for the admin role. Dedicated admin-facing module integration comes in later batches, so this page intentionally remains small and contract-safe.
        </p>

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          <div style={{ border: `1.5px solid ${C.bd}`, borderRadius: 18, padding: 18, background: '#fbfdff' }}>
            <div style={{ fontSize: 12, color: C.kS, marginBottom: 6 }}>Signed in user</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.k }}>{getUserDisplayName(user, 'admin')}</div>
            <div style={{ fontSize: 13, color: C.kS, marginTop: 4 }}>{user?.email || 'No email loaded'}</div>
          </div>

          <div style={{ border: `1.5px solid ${C.bd}`, borderRadius: 18, padding: 18, background: '#fbfdff' }}>
            <div style={{ fontSize: 12, color: C.kS, marginBottom: 6 }}>Resolved role</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.k }}>{getUserRoleLabel(user, 'admin')}</div>
            <div style={{ fontSize: 13, color: C.kS, marginTop: 4 }}>Protected route contract confirmed</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <button type="button" onClick={goToChangePassword} style={S.btn('ghost')}>Change Password</button>
          <button type="button" onClick={handleLogout} style={S.btn('primary')}>Logout</button>
        </div>
      </div>
    </div>
  )
}
