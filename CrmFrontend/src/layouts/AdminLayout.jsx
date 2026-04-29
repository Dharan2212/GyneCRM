import { Outlet, useNavigate } from 'react-router-dom'
import Topbar from '../crm/layout/Topbar.jsx'
import { C } from '../crm/data.js'
import { useAuth } from '../modules/auth/AuthContext.jsx'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/crm/login', { replace: true })
  }

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: C.bg, minHeight: '100vh', color: C.k }}>
      <Topbar
        role="admin"
        user={user}
        onLogout={handleLogout}
        onChangePassword={() => navigate('/crm/change-password')}
      />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
        <Outlet />
      </div>
    </div>
  )
}
