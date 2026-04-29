import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function createPregnancy({ token, payload } = {}) {
  const response = await apiClient.post('/pregnancies', { token, body: payload })
  return unwrapApiData(response)
}

export async function getPregnancyDetail({ token, id } = {}) {
  const response = await apiClient.get(`/pregnancies/${id}`, { token })
  return unwrapApiData(response)
}

export async function updatePregnancy({ token, id, payload } = {}) {
  const response = await apiClient.put(`/pregnancies/${id}`, { token, body: payload })
  return unwrapApiData(response)
}

export async function updatePregnancyHighRisk({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/pregnancies/${id}/high-risk`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getPregnancyMilestones({ token, id } = {}) {
  const response = await apiClient.get(`/pregnancies/${id}/milestones`, { token })
  return unwrapApiData(response)
}

export async function updatePregnancyMilestones({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/pregnancies/${id}/milestones`, { token, body: payload })
  return unwrapApiData(response)
}

export async function updatePregnancyMilestoneStatus({ token, id, milestoneCode, payload } = {}) {
  const response = await apiClient.patch(`/pregnancies/${id}/milestones/${milestoneCode}/status`, { token, body: payload })
  return unwrapApiData(response)
}
