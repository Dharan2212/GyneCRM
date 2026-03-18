/**
 * GyneCRM — Appointment Type Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend Route Status:
 * The appointment_types table (migration 006) exists and is used by appointments.
 * However, no dedicated /appointment-types route is registered in routes/index.js.
 * These may be served via hospital settings or as a sub-resource.
 *
 * This service is forward-compatible — uses expected URL pattern.
 * No code changes needed when backend routes are activated in Phase 9.
 */

import apiClient from './apiClient';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/appointment-types`;

/**
 * List all appointment types for the hospital.
 * @param {{ is_active?: boolean }} params
 */
export async function listAppointmentTypes(params = {}) {
  const r = await apiClient.get(BASE, { params });
  return r.data.data;
}

/**
 * Get a single appointment type.
 * @param {string} id
 */
export async function getAppointmentType(id) {
  const r = await apiClient.get(`${BASE}/${id}`);
  return r.data.data;
}

/**
 * Create an appointment type.
 * Admin only.
 * @param {{ name, duration_minutes, buffer_minutes?, color_code?, is_active? }} data
 */
export async function createAppointmentType(data) {
  const r = await apiClient.post(BASE, data);
  return r.data.data;
}

/**
 * Update an appointment type.
 * Admin only.
 * @param {string} id
 * @param {object} updates
 */
export async function updateAppointmentType(id, updates) {
  const r = await apiClient.put(`${BASE}/${id}`, updates);
  return r.data.data;
}
