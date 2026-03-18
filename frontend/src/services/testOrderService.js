/**
 * GyneCRM — Test Order Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/test-orders
 * Verified routes:
 *   GET    /test-orders/overdue         — list overdue orders (doctor, admin, receptionist)
 *   POST   /test-orders                 — create test order (doctor, admin)
 *   GET    /test-orders                 — list with filters (doctor, admin, receptionist)
 *   PATCH  /test-orders/:id/skip        — skip a test order (doctor, admin)
 *   PATCH  /test-orders/:id/link-result — link uploaded document as result (all roles)
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/test-orders`;

/**
 * List test orders with optional filters.
 * @param {{ patient_id?, pregnancy_id?, status?, doctor_id?, page?, limit? }} params
 */
export async function listTestOrders(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.TEST_ORDERS.LIST, { params });
  return r.data.data;
}

/**
 * Get overdue test orders.
 * @param {{ page?, limit? }} params
 */
export async function listOverdueTestOrders(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.TEST_ORDERS.OVERDUE, { params });
  return r.data.data;
}

/**
 * Create a test order.
 * @param {{ patient_id, pregnancy_id?, test_catalog_id, due_date?, notes?, appointment_id? }} data
 */
export async function createTestOrder(data) {
  const r = await apiClient.post(API_ENDPOINTS.TEST_ORDERS.CREATE, data);
  return r.data.data;
}

/**
 * Skip a test order (doctor, admin) — e.g. patient refused test.
 * @param {string} id
 * @param {{ reason: string }} data
 */
export async function skipTestOrder(id, data) {
  const r = await apiClient.patch(`${BASE}/${id}/skip`, data);
  return r.data.data;
}

/**
 * Link an uploaded document as the result for this test order.
 * @param {string} id
 * @param {{ document_id: string }} data
 */
export async function linkTestResult(id, data) {
  const r = await apiClient.patch(`${BASE}/${id}/link-result`, data);
  return r.data.data;
}
