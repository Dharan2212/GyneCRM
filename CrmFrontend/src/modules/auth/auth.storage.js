const STORAGE_KEY = 'gynecrm.auth.session'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function readStoredAuthSession() {
  if (!canUseStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      accessToken: parsed?.accessToken || null,
      user: parsed?.user || null,
    }
  } catch {
    return null
  }
}

export function writeStoredAuthSession(session) {
  if (!canUseStorage()) return

  const safeSession = {
    accessToken: session?.accessToken || null,
    user: session?.user || null,
  }

  if (!safeSession.accessToken || !safeSession.user) {
    clearStoredAuthSession()
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeSession))
}

export function clearStoredAuthSession() {
  if (!canUseStorage()) return
  window.sessionStorage.removeItem(STORAGE_KEY)
}
