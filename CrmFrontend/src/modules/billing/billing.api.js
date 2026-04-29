import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData, unwrapApiItems, unwrapApiMeta } from '../../lib/api/response.js'

const BILLING_BASE = '/billing/invoices'

export async function listInvoices({ token, query } = {}) {
  const response = await apiClient.get(BILLING_BASE, { token, query })
  return { data: unwrapApiData(response), items: unwrapApiItems(response), meta: unwrapApiMeta(response), raw: response }
}

export async function createInvoice({ token, payload } = {}) {
  const response = await apiClient.post(BILLING_BASE, { token, body: payload })
  return unwrapApiData(response)
}

export async function getInvoiceDetail({ token, id } = {}) {
  const response = await apiClient.get(`${BILLING_BASE}/${id}`, { token })
  return unwrapApiData(response)
}

export async function updateInvoice({ token, id, payload } = {}) {
  const response = await apiClient.put(`${BILLING_BASE}/${id}`, { token, body: payload })
  return unwrapApiData(response)
}

export async function addInvoiceItems({ token, id, payload } = {}) {
  const response = await apiClient.post(`${BILLING_BASE}/${id}/items`, { token, body: payload })
  return unwrapApiData(response)
}

export async function finalizeInvoice({ token, id, payload } = {}) {
  const response = await apiClient.post(`${BILLING_BASE}/${id}/finalize`, { token, body: payload || {} })
  return unwrapApiData(response)
}

export async function recordInvoicePayment({ token, id, payload } = {}) {
  const response = await apiClient.post(`${BILLING_BASE}/${id}/payments`, { token, body: payload })
  return unwrapApiData(response)
}

export async function getInvoicePdf({ token, id } = {}) {
  const response = await apiClient.get(`${BILLING_BASE}/${id}/pdf`, { token })
  return unwrapApiData(response)
}

export async function sendInvoice({ token, id, payload } = {}) {
  const response = await apiClient.post(`${BILLING_BASE}/${id}/send`, { token, body: payload || {} })
  return unwrapApiData(response)
}
