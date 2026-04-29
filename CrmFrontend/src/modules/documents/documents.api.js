import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems, unwrapApiMeta } from '../../lib/api/response.js'

export async function getDocumentUploadUrl({ token, payload } = {}) {
  const response = await apiClient.post('/documents/upload-url', { token, body: payload })
  return unwrapApiData(response)
}

export async function createDocument({ token, payload } = {}) {
  const response = await apiClient.post('/documents', { token, body: payload })
  return unwrapApiData(response)
}

export async function getDocumentReviewInbox({ token, query } = {}) {
  const response = await apiClient.get('/documents/review-inbox', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function reviewDocument({ token, id, payload } = {}) {
  const response = await apiClient.post(`/documents/${id}/review`, { token, body: payload })
  return unwrapApiData(response)
}

export async function flagDocument({ token, id, payload } = {}) {
  const response = await apiClient.post(`/documents/${id}/flag`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getDocumentUrl({ token, id } = {}) {
  const response = await apiClient.get(`/documents/${id}/url`, { token })
  return unwrapApiData(response)
}
