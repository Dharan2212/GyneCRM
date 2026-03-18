/**
 * GyneCRM — Service Catalog Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend Route Status:
 * The service_catalog table (migration 005) exists and is used by invoices.
 * No dedicated /service-catalog route is registered in routes/index.js.
 *
 * Forward-compatible wrapper — no code changes needed when backend activates.
 */

import apiClient from './apiClient';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/service-catalog`;

/**
 * List all services in the catalog.
 * @param {{ is_active?: boolean, page?, limit? }} params
 */
export async function listServiceCatalog(params = {}) {
  const r = await apiClient.get(BASE, { params });
  return r.data.data;
}

/**
 * Get a single catalog item.
 * @param {string} id
 */
export async function getServiceCatalogItem(id) {
  const r = await apiClient.get(`${BASE}/${id}`);
  return r.data.data;
}

/**
 * Create a service catalog item.
 * Admin only.
 * @param {{ name, description?, default_price, is_active? }} data
 */
export async function createServiceCatalogItem(data) {
  const r = await apiClient.post(BASE, data);
  return r.data.data;
}

/**
 * Update a service catalog item.
 * Admin only.
 * @param {string} id
 * @param {object} updates
 */
export async function updateServiceCatalogItem(id, updates) {
  const r = await apiClient.put(`${BASE}/${id}`, updates);
  return r.data.data;
}
