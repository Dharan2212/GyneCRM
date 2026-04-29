import { apiRequest } from './http.js'

export const apiClient = {
  request: apiRequest,
  get(path, options = {}) {
    return apiRequest(path, { ...options, method: 'GET' })
  },
  post(path, options = {}) {
    return apiRequest(path, { ...options, method: 'POST' })
  },
  put(path, options = {}) {
    return apiRequest(path, { ...options, method: 'PUT' })
  },
  patch(path, options = {}) {
    return apiRequest(path, { ...options, method: 'PATCH' })
  },
  delete(path, options = {}) {
    return apiRequest(path, { ...options, method: 'DELETE' })
  },
}
