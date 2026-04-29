import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems, unwrapApiMeta } from '../../lib/api/response.js'

export async function listPatients({ token, query } = {}) {
  const response = await apiClient.get('/patients', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function registerPatient({ token, payload } = {}) {
  const response = await apiClient.post('/patients', { token, body: payload })
  return unwrapApiData(response)
}

export async function getPatientDetail({ token, id } = {}) {
  const response = await apiClient.get(`/patients/${id}`, { token })
  return unwrapApiData(response)
}

export async function updatePatient({ token, id, payload } = {}) {
  const response = await apiClient.put(`/patients/${id}`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getPatientHub({ token, id } = {}) {
  const response = await apiClient.get(`/patients/${id}/hub`, { token })
  return unwrapApiData(response)
}

export async function getPatientCategoryHistory({ token, id } = {}) {
  const response = await apiClient.get(`/patients/${id}/category-history`, { token })
  return unwrapApiData(response)
}

export async function updatePatientCategory({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/patients/${id}/category`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getPatientCategoryCounts({ token, query } = {}) {
  const response = await apiClient.get('/patients/category-counts', { token, query })
  return unwrapApiData(response)
}
