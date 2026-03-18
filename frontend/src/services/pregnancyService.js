/**
 * GyneCRM — Pregnancy Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/pregnancies
 * Verified routes:
 *   POST   /pregnancies                    — create (doctor, admin)
 *   GET    /pregnancies/:id                — get detail (doctor, admin, receptionist)
 *   PUT    /pregnancies/:id                — update (doctor, admin)
 *   PATCH  /pregnancies/:id/high-risk      — toggle high-risk with reason (doctor, admin)
 *   POST   /pregnancies/:id/close          — close pregnancy (doctor, admin)
 *   GET    /pregnancies/:id/milestones     — get protocol milestones (doctor, admin, receptionist)
 *
 * NOTE: No list (GET /) endpoint in backend.
 * Patient pregnancies are fetched via the patient profile query (Phase 8.2+).
 * High-risk list comes from analyticsService.getHighRisk().
 */

import apiClient from './apiClient';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/pregnancies`;

/**
 * Create a new pregnancy record.
 * @param {{ patient_id, lmp_date, gravida, para, notes? }} data
 */
export async function createPregnancy(data) {
  const r = await apiClient.post(BASE, data);
  return r.data.data;
}

/**
 * Get a pregnancy record by ID.
 * @param {string} id
 */
export async function getPregnancy(id) {
  const r = await apiClient.get(`${BASE}/${id}`);
  return r.data.data;
}

/**
 * Update a pregnancy record.
 * @param {string} id
 * @param {object} updates
 */
export async function updatePregnancy(id, updates) {
  const r = await apiClient.put(`${BASE}/${id}`, updates);
  return r.data.data;
}

/**
 * Toggle the high-risk flag with a mandatory clinical reason.
 * Logged to override_logs automatically by backend.
 * @param {string} id
 * @param {{ is_high_risk: boolean, reason: string }} data
 */
export async function toggleHighRisk(id, data) {
  const r = await apiClient.patch(`${BASE}/${id}/high-risk`, data);
  return r.data.data;
}

/**
 * Close a pregnancy record.
 * @param {string} id
 * @param {{ outcome: 'delivered'|'miscarriage'|'terminated', notes?, close_date? }} data
 */
export async function closePregnancy(id, data) {
  const r = await apiClient.post(`${BASE}/${id}/close`, data);
  return r.data.data;
}

/**
 * Get protocol milestones for a pregnancy.
 * @param {string} id
 * @returns {Promise<Array>}
 */
export async function getPregnancyMilestones(id) {
  const r = await apiClient.get(`${BASE}/${id}/milestones`);
  return r.data.data;
}
