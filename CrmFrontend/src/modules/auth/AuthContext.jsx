import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  changePasswordApi,
  loginApi,
  logoutApi,
  refreshSessionApi,
} from './auth.api.js'
import { AUTH_STATUS } from './auth.constants.js'
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './auth.storage.js'
import {
  clearAuthSession,
  getAuthSession,
  registerAuthSessionHandlers,
  setAuthSession,
} from './auth.session.js'

const AuthContext = createContext(null)

function normalizeAuthPayload(payload) {
  return {
    accessToken: payload?.data?.access_token || null,
    user: payload?.data?.user || null,
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(AUTH_STATUS.BOOTSTRAPPING)
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const applySession = useCallback((nextSession) => {
    const session = setAuthSession(nextSession)

    setAccessToken(session.accessToken)
    setUser(session.user)

    if (session.accessToken && session.user) {
      writeStoredAuthSession(session)
      setStatus(AUTH_STATUS.AUTHENTICATED)
    } else {
      clearStoredAuthSession()
      setStatus(AUTH_STATUS.ANONYMOUS)
    }

    return session
  }, [])

  const clearSession = useCallback(() => {
    clearAuthSession()
    clearStoredAuthSession()
    setAccessToken(null)
    setUser(null)
    setStatus(AUTH_STATUS.ANONYMOUS)
  }, [])

  const refreshSession = useCallback(async ({ reason } = {}) => {
    setIsRefreshing(true)
    try {
      const response = await refreshSessionApi({ reason })
      const session = normalizeAuthPayload(response)
      return applySession(session)
    } finally {
      setIsRefreshing(false)
    }
  }, [applySession])

  const login = useCallback(async (credentials) => {
    const response = await loginApi(credentials)
    const session = normalizeAuthPayload(response)
    return applySession(session)
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      if (getAuthSession().accessToken) {
        await logoutApi()
      }
    } finally {
      clearSession()
    }
  }, [clearSession])

  const changePassword = useCallback(async (payload) => {
    if (!getAuthSession().accessToken) {
      const error = new Error('Active session is required to change password.')
      error.status = 401
      throw error
    }

    const response = await changePasswordApi(payload)
    clearSession()
    return response
  }, [clearSession])

  useEffect(() => {
    registerAuthSessionHandlers({
      refreshSession,
      clearSession,
    })

    return () => {
      registerAuthSessionHandlers({})
    }
  }, [clearSession, refreshSession])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      const stored = readStoredAuthSession()
      if (stored?.accessToken && stored?.user && isMounted) {
        setAuthSession(stored)
        setAccessToken(stored.accessToken)
        setUser(stored.user)
      }

      try {
        await refreshSession({ reason: 'bootstrap' })
      } catch {
        if (isMounted) {
          clearSession()
        }
      } finally {
        if (isMounted) {
          setStatus((current) => (
            current === AUTH_STATUS.BOOTSTRAPPING ? AUTH_STATUS.ANONYMOUS : current
          ))
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [clearSession, refreshSession])

  const value = useMemo(() => ({
    initialized: status !== AUTH_STATUS.BOOTSTRAPPING,
    status,
    isBootstrapping: status === AUTH_STATUS.BOOTSTRAPPING,
    isRestoring: status === AUTH_STATUS.BOOTSTRAPPING || isRefreshing,
    isRefreshing,
    isAuthenticated: Boolean(user && accessToken),
    user,
    role: user?.role || null,
    accessToken,
    login,
    logout,
    refreshSession,
    changePassword,
    clearSession,
  }), [
    accessToken,
    changePassword,
    clearSession,
    isRefreshing,
    login,
    logout,
    refreshSession,
    status,
    user,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
