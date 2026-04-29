import { apiClient } from '../../lib/api/client.js'
import { unwrapApiData } from '../../lib/api/response.js'

export async function getDoctorDashboard({ query } = {}) {
  const response = await apiClient.get('/dashboard/doctor', { query })
  return unwrapApiData(response)
}
