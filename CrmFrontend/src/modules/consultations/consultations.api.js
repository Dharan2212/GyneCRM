import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems, unwrapApiMeta } from '../../lib/api/response.js'

export async function createConsultation({ token, payload } = {}) {
  const response = await apiClient.post('/consultations', { token, body: payload })
  return unwrapApiData(response)
}

export async function getConsultationDetail({ token, id } = {}) {
  const response = await apiClient.get(`/consultations/${id}`, { token })
  return unwrapApiData(response)
}

export async function updateConsultation({ token, id, payload } = {}) {
  const response = await apiClient.put(`/consultations/${id}`, { token, body: payload })
  return unwrapApiData(response)
}

export async function updateConsultationStatus({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/consultations/${id}/status`, { token, body: payload })
  return unwrapApiData(response)
}

export async function finaliseConsultation({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/consultations/${id}/finalise`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getConsultationWorkspace({ token, id } = {}) {
  const response = await apiClient.get(`/consultations/${id}/workspace`, { token })
  return unwrapApiData(response)
}

export async function getConsultationFollowUp({ token, id } = {}) {
  const response = await apiClient.get(`/consultations/${id}/follow-up`, { token })
  return unwrapApiData(response)
}

export async function listFollowUps({ token, query } = {}) {
  const response = await apiClient.get('/consultations/follow-ups', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function updateFollowUpStatus({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/consultations/follow-ups/${id}/status`, { token, body: payload })
  return unwrapApiData(response)
}
