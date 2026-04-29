import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function createPrescription({ token, payload } = {}) {
  const response = await apiClient.post('/prescriptions', { token, body: payload })
  return unwrapApiData(response)
}

export async function getPrescriptionDetail({ token, id } = {}) {
  const response = await apiClient.get(`/prescriptions/${id}`, { token })
  return unwrapApiData(response)
}

export async function issuePrescription({ token, id, payload } = {}) {
  const response = await apiClient.post(`/prescriptions/${id}/issue`, { token, body: payload || {} })
  return unwrapApiData(response)
}

export async function voidPrescription({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/prescriptions/${id}/void`, { token, body: payload || {} })
  return unwrapApiData(response)
}

export async function getPrescriptionPdf({ token, id } = {}) {
  const response = await apiClient.get(`/prescriptions/${id}/pdf`, { token })
  return unwrapApiData(response)
}

export async function sendPrescription({ token, id, payload } = {}) {
  const response = await apiClient.post(`/prescriptions/${id}/send`, { token, body: payload || {} })
  return unwrapApiData(response)
}
