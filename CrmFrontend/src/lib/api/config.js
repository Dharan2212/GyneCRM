const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:8082/api/v1'
const DEFAULT_PRODUCTION_API_PATH = '/api/v1'

function normalizeUrl(value = '') {
  return String(value || '').trim().replace(/\/$/, '')
}

function getRuntimeOrigin() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return ''
  }

  return window.location.origin
}

function resolveApiBaseUrl() {
  const configured = normalizeUrl(import.meta.env.VITE_API_BASE_URL)
  if (configured) {
    return configured
  }

  if (import.meta.env.DEV) {
    return DEFAULT_LOCAL_API_BASE_URL
  }

  const runtimeOrigin = normalizeUrl(getRuntimeOrigin())
  if (runtimeOrigin) {
    return `${runtimeOrigin}${DEFAULT_PRODUCTION_API_PATH}`
  }

  return DEFAULT_LOCAL_API_BASE_URL
}

export const APP_ENV = String(import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development')
export const API_BASE_URL = resolveApiBaseUrl()
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000)
export const API_CREDENTIALS_MODE = String(import.meta.env.VITE_API_CREDENTIALS_MODE || 'include').toLowerCase() === 'omit'
  ? 'omit'
  : 'include'

export function normalizeApiPath(path = '') {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function buildApiUrl(path = '', queryString = '') {
  const normalizedPath = normalizeApiPath(path)
  return `${API_BASE_URL}${normalizedPath}${queryString}`
}
