import { Navigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthContext.jsx'
import AuthScreenState from '../modules/auth/AuthScreenState.jsx'
import { getRoleHomePathForUser } from '../modules/auth/auth.redirects.js'

export default function GuestRoute({ children }) {
  const { initialized, isAuthenticated, user } = useAuth()

  if (!initialized) {
    return (
      <AuthScreenState
        title="Checking your session..."
        subtitle="Loading guest access after session restore finishes."
      />
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleHomePathForUser(user)} replace />
  }

  return children
}
