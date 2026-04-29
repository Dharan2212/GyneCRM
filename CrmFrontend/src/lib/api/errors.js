export function createApiError({
  message = 'Request failed.',
  status = 0,
  details = null,
  payload = null,
  code = 'API_REQUEST_FAILED',
  cause = null,
} = {}) {
  const error = new Error(message)
  error.name = 'ApiError'
  error.status = status
  error.details = details
  error.payload = payload
  error.code = code
  error.cause = cause
  return error
}

export function extractApiErrorMessage(payload, status) {
  if (payload?.message) return payload.message
  if (typeof payload?.error === 'string') return payload.error
  if (status === 401) return 'Unauthorized request.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'Requested resource was not found.'
  return `Request failed with status ${status}.`
}
