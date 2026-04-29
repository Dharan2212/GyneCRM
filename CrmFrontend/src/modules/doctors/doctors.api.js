import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function listDoctors({ query } = {}) {
  const response = await apiClient.get('/doctors', { query })
  return {
    items: unwrapApiData(response) || [],
    meta: response?.meta || null,
  }
}
