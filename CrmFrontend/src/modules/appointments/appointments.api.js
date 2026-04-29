import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function listAppointments({ query } = {}) {
  const response = await apiClient.get('/appointments', { query })
  return {
    items: unwrapApiData(response) || [],
    meta: response?.meta || null,
  }
}

export async function getAppointmentDetail({ id }) {
  const response = await apiClient.get(`/appointments/${id}`)
  return unwrapApiData(response)
}

export async function createAppointment({ payload }) {
  const response = await apiClient.post('/appointments', { body: payload })
  return unwrapApiData(response)
}

export async function checkInAppointment({ id }) {
  const response = await apiClient.post(`/appointments/${id}/check-in`)
  return unwrapApiData(response)
}

export async function updateAppointmentStatus({ id, payload }) {
  const response = await apiClient.patch(`/appointments/${id}/status`, { body: payload })
  return unwrapApiData(response)
}

export async function rescheduleAppointment({ id, payload }) {
  const response = await apiClient.patch(`/appointments/${id}/reschedule`, { body: payload })
  return unwrapApiData(response)
}

export async function listAppointmentTypes({ query } = {}) {
  const response = await apiClient.get('/masters/appointment-types', { query })
  return {
    items: unwrapApiData(response) || [],
    meta: response?.meta || null,
  }
}
