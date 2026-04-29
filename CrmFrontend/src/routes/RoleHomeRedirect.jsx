import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthContext.jsx'
import AuthScreenState from '../modules/auth/AuthScreenState.jsx'
import { getRoleHomePath } from '../modules/auth/auth.redirects.js'

export default function RoleHomeRedirect() {
  const location = useLocation()
  const { initialized, isAuthenticated, user } = useAuth()

  if (!initialized) {
    return <AuthScreenState title="Checking session..." subtitle="Please wait while your CRM access is restored." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/crm/login" replace state={{ from: location }} />
  }

  return <Navigate to={getRoleHomePath(user?.role)} replace />
}
