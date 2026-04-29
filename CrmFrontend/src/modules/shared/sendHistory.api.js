import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems } from '../../lib/api/response.js'

export async function listSendHistory({ token, query } = {}) {
  const response = await apiClient.get('/send-history', { token, query })
  return {
    data: unwrapApiData(response),
    items: unwrapApiItems(response),
    raw: response,
  }
}

export async function getPatientSendHistory({ token, patientId, query } = {}) {
  const response = await apiClient.get(`/patients/${patientId}/send-history`, { token, query })
  return {
    data: unwrapApiData(response),
    items: unwrapApiItems(response),
    raw: response,
  }
}

export async function getSendHistoryDetail({ token, id } = {}) {
  const response = await apiClient.get(`/send-history/${id}`, { token })
  return unwrapApiData(response)
}
