import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Topbar from '../crm/layout/Topbar.jsx'
import Sidebar from '../crm/layout/Sidebar.jsx'
import { C } from '../crm/data.js'
import { useAuth } from '../modules/auth/AuthContext.jsx'
import { getActivePageIdForRole, getVisibleNavigation, getPagePathForRole } from '../modules/rbac/navPolicy.js'
import { getResolvedRole } from '../modules/rbac/roleIdentity.js'
import { useReducedMotion } from '../modules/shared/ui/motion/index.js'

export default function CrmShellLayout({ role }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const reducedMotion = useReducedMotion()

  const shellRole = getResolvedRole(user?.role, role) || role
  const nav = getVisibleNavigation(shellRole, {})
  const activePage = getActivePageIdForRole(shellRole, location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/crm/login', { replace: true })
  }

  const handleChangePassword = () => {
    navigate('/crm/change-password')
  }

  const handleNav = (pageId) => {
    navigate(getPagePathForRole(shellRole, pageId))
  }

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: C.bg, minHeight: '100vh', color: C.k }}>
      <Topbar
        role={shellRole}
        user={user}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
      />

      <div style={{ display: 'flex' }}>
        <Sidebar nav={nav} active={activePage} onNav={handleNav} />
        <div
          key={location.pathname}
          style={{
            flex: 1,
            padding: 'clamp(16px, 2vw, 24px)',
            minHeight: 'calc(100vh - 58px)',
            overflowX: 'hidden',
            animation: reducedMotion ? 'none' : 'rise .2s ease',
            background: 'linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))',
          }}
        >
          <Outlet />
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.bd}; border-radius: 3px; }
        @keyframes rise { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
        input, select, textarea, button { font-family: inherit; }
        button:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
