import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function getReceptionDashboard({ query } = {}) {
  const response = await apiClient.get('/dashboard/receptionist', { query })
  return unwrapApiData(response)
}
