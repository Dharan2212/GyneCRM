import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems, unwrapApiMeta } from '../../lib/api/response.js'

export async function listTestOrders({ token, query } = {}) {
  const response = await apiClient.get('/test-orders', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function createTestOrder({ token, payload } = {}) {
  const response = await apiClient.post('/test-orders', { token, body: payload })
  return unwrapApiData(response)
}

export async function getTestOrderDetail({ token, id } = {}) {
  const response = await apiClient.get(`/test-orders/${id}`, { token })
  return unwrapApiData(response)
}

export async function getPendingUploadTestOrders({ token, query } = {}) {
  const response = await apiClient.get('/test-orders/pending-upload', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function getPendingReviewTestOrders({ token, query } = {}) {
  const response = await apiClient.get('/test-orders/pending-review', { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function moveTestOrderToPendingUpload({ token, id, payload } = {}) {
  const response = await apiClient.post(`/test-orders/${id}/pending-upload`, { token, body: payload || {} })
  return unwrapApiData(response)
}

export async function linkTestOrderResult({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/test-orders/${id}/link-result`, { token, body: payload })
  return unwrapApiData(response)
}

export async function reviewTestOrderResult({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/test-orders/${id}/review-result`, { token, body: payload })
  return unwrapApiData(response)
}

export async function sendTestOrderResult({ token, id, payload } = {}) {
  const response = await apiClient.patch(`/test-orders/${id}/send-result`, { token, body: payload || {} })
  return unwrapApiData(response)
}
