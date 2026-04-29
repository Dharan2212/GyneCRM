import { apiClient } from '../../lib/api/client.js'

export function loginApi(payload) {
  return apiClient.post('/auth/login', {
    body: payload,
    includeAuthHeader: false,
    retryOnUnauthorized: false,
  })
}

export function refreshSessionApi() {
  return apiClient.post('/auth/refresh', {
    body: {},
    includeAuthHeader: false,
    retryOnUnauthorized: false,
  })
}

export function logoutApi() {
  return apiClient.post('/auth/logout', {
    body: {},
    retryOnUnauthorized: false,
  })
}

export function changePasswordApi(payload) {
  return apiClient.post('/auth/change-password', {
    body: payload,
    retryOnUnauthorized: false,
  })
}
