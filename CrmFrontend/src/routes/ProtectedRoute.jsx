import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthContext.jsx'
import AuthScreenState from '../modules/auth/AuthScreenState.jsx'
import { getRoleHomePathForUser } from '../modules/auth/auth.redirects.js'

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation()
  const { initialized, isAuthenticated, user } = useAuth()

  if (!initialized) {
    return (
      <AuthScreenState
        title="Checking your session..."
        subtitle="Restoring the last active GyneCRM session."
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/crm/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleHomePathForUser(user)} replace />
  }

  return children
}
