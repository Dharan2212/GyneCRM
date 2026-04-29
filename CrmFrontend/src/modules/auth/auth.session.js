let currentSession = {
  accessToken: null,
  user: null,
}

let refreshHandler = null
let clearHandler = null
let refreshPromise = null

function normalizeSession(session) {
  return {
    accessToken: session?.accessToken || null,
    user: session?.user || null,
  }
}

export function getAuthSession() {
  return { ...currentSession }
}

export function getAccessToken() {
  return currentSession.accessToken || null
}

export function getAuthUser() {
  return currentSession.user || null
}

export function setAuthSession(session) {
  currentSession = normalizeSession(session)
  return getAuthSession()
}

export function clearAuthSession() {
  currentSession = normalizeSession(null)
  return getAuthSession()
}

export function registerAuthSessionHandlers({ refreshSession, clearSession } = {}) {
  refreshHandler = typeof refreshSession === 'function' ? refreshSession : null
  clearHandler = typeof clearSession === 'function' ? clearSession : null
}

export async function refreshAuthSession(reason = 'auth-recovery') {
  if (!refreshHandler) {
    const error = new Error('Auth refresh handler is not registered.')
    error.code = 'AUTH_REFRESH_UNAVAILABLE'
    throw error
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const session = await refreshHandler({ reason })
      return normalizeSession(session)
    } catch (error) {
      if (clearHandler) {
        clearHandler()
      }
      throw error
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export function isRefreshInProgress() {
  return Boolean(refreshPromise)
}
