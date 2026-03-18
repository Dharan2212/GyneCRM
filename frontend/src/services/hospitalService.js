/**
 * GyneCRM — Hospital Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/hospital
 * Verified routes (all admin-only, hospital-scoped):
 *   GET    /hospital             — get hospital profile
 *   GET    /hospital/settings    — list all hospital settings
 *   PUT    /hospital/settings    — bulk update settings
 *
 * NOTE: /hospital/branches is in API_ENDPOINTS.HOSPITAL.BRANCHES but the
 * real backend hospital.routes.js only has /, /settings, /settings (PUT).
 * Branch management routes may live elsewhere or be added in Phase 9.
 * This service uses only confirmed routes for live calls.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * Get the hospital profile.
 * Admin only.
 * @returns {Promise<object>} — hospital record
 */
export async function getHospital() {
  const r = await apiClient.get(API_ENDPOINTS.HOSPITAL.PROFILE);
  return r.data.data;
}

/**
 * Get all hospital settings key-value pairs.
 * Admin only.
 * @returns {Promise<object>} — settings object
 */
export async function getHospitalSettings() {
  const r = await apiClient.get(API_ENDPOINTS.HOSPITAL.SETTINGS);
  return r.data.data;
}

/**
 * Bulk update hospital settings.
 * Admin only.
 * @param {object} settings — key-value map of settings to update
 * @returns {Promise<object>} — updated settings
 */
export async function updateHospitalSettings(settings) {
  const r = await apiClient.put(API_ENDPOINTS.HOSPITAL.SETTINGS, settings);
  return r.data.data;
}

/**
 * List branches for this hospital.
 * NOTE: Route not confirmed in hospital.routes.js — may be served elsewhere.
 * Forward-compatible wrapper using expected URL pattern.
 * @param {{ is_active?: boolean }} params
 */
export async function listBranches(params = {}) {
  const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`;
  const r = await apiClient.get(`${BASE}/branches`, { params });
  return r.data.data;
}

/**
 * Get a single branch.
 * @param {string} id
 */
export async function getBranch(id) {
  const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`;
  const r = await apiClient.get(`${BASE}/branches/${id}`);
  return r.data.data;
}

/**
 * Create a branch.
 * Admin only. Forward-compatible.
 * @param {{ name, address?, phone?, is_active? }} data
 */
export async function createBranch(data) {
  const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`;
  const r = await apiClient.post(`${BASE}/branches`, data);
  return r.data.data;
}

/**
 * Update a branch.
 * Admin only. Forward-compatible.
 * @param {string} id
 * @param {object} updates
 */
export async function updateBranch(id, updates) {
  const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`;
  const r = await apiClient.put(`${BASE}/branches/${id}`, updates);
  return r.data.data;
}
