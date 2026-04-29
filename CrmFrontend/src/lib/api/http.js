import { API_CREDENTIALS_MODE, API_TIMEOUT_MS, buildApiUrl } from './config.js'
import { createApiError, extractApiErrorMessage } from './errors.js'
import { buildQueryString } from './query.js'
import { getAccessToken, refreshAuthSession } from '../../modules/auth/auth.session.js'

async function parseResponseBody(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    return text ? { message: text } : null
  } catch {
    return null
  }
}

function isRecoverableUnauthorized(path, options, effectiveToken) {
  if (!effectiveToken) return false
  if (options.retryOnUnauthorized === false) return false
  if (options.__isRetryRequest) return false
  return !String(path || '').startsWith('/auth/')
}

async function performRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    token,
    query,
    includeAuthHeader = true,
    signal,
    timeoutMs = API_TIMEOUT_MS,
  } = options

  const finalHeaders = { Accept: 'application/json', ...headers }
  const hasBody = body !== undefined && body !== null
  const effectiveToken = includeAuthHeader ? (token || getAccessToken()) : token

  if (hasBody && !(body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json'
  }

  if (effectiveToken && includeAuthHeader) {
    finalHeaders.Authorization = `Bearer ${effectiveToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort('request-timeout'), timeoutMs)

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId)
      throw createApiError({ message: 'Request was aborted.', code: 'REQUEST_ABORTED' })
    }

    signal.addEventListener('abort', () => controller.abort(signal.reason || 'request-aborted'), { once: true })
  }

  let response

  try {
    response = await fetch(buildApiUrl(path, buildQueryString(query)), {
      method,
      credentials: API_CREDENTIALS_MODE,
      headers: finalHeaders,
      body: hasBody ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)

    if (controller.signal.aborted) {
      throw createApiError({
        message: 'Request timed out or was aborted.',
        code: 'REQUEST_ABORTED',
        cause: error,
      })
    }

    throw createApiError({
      message: 'Unable to reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
      cause: error,
    })
  }

  clearTimeout(timeoutId)
  const payload = await parseResponseBody(response)

  if (response.status === 401 && isRecoverableUnauthorized(path, options, effectiveToken)) {
    await refreshAuthSession('http-401-recovery')
    return performRequest(path, {
      ...options,
      token: getAccessToken(),
      __isRetryRequest: true,
    })
  }

  if (!response.ok || payload?.success === false) {
    throw createApiError({
      message: extractApiErrorMessage(payload, response.status),
      status: response.status,
      details: payload?.details || null,
      payload,
      code: 'HTTP_ERROR',
    })
  }

  return payload
}

export async function apiRequest(path, options = {}) {
  return performRequest(path, options)
}
