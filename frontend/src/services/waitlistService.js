/**
 * GyneCRM — Waitlist Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend Route Status:
 * The backend does NOT yet have a dedicated /waitlist endpoint registered.
 * The waitlist table (migration 020_create_waitlist.js) exists and is referenced in
 * API_ENDPOINTS.APPOINTMENTS.WAITLIST. The full CRUD will be confirmed in Phase 9.
 *
 * This service is written against the expected route pattern:
 *   GET    /api/v1/waitlist              — list (admin, receptionist)
 *   POST   /api/v1/waitlist              — add to waitlist
 *   PATCH  /api/v1/waitlist/:id/offer    — offer a slot
 *   PATCH  /api/v1/waitlist/:id/accept   — patient accepts
 *   PATCH  /api/v1/waitlist/:id/bypass   — bypass this entry
 *   PATCH  /api/v1/waitlist/:id/expire   — expire this entry
 *   DELETE /api/v1/waitlist/:id          — remove entry
 *
 * No changes to this file will be needed when backend routes are activated.
 */

import apiClient from './apiClient';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/waitlist`;

/**
 * List waitlist entries with optional filters.
 * @param {{ doctor_id?, date?, status?, page?, limit? }} params
 */
export async function listWaitlist(params = {}) {
  const r = await apiClient.get(BASE, { params });
  return r.data.data;
}

/**
 * Add a patient to the waitlist.
 * @param {{ patient_id, doctor_id, preferred_date?, preferred_time?, priority_note? }} data
 */
export async function addToWaitlist(data) {
  const r = await apiClient.post(BASE, data);
  return r.data.data;
}

/**
 * Offer a specific appointment slot to a waitlisted patient.
 * @param {string} id — waitlist entry ID
 * @param {{ appointment_id: string, offer_expires_at: string, send_whatsapp?: boolean }} data
 */
export async function offerSlot(id, data) {
  const r = await apiClient.patch(`${BASE}/${id}/offer`, data);
  return r.data.data;
}

/**
 * Mark a waitlist entry as accepted.
 * @param {string} id
 */
export async function acceptWaitlistEntry(id) {
  const r = await apiClient.patch(`${BASE}/${id}/accept`);
  return r.data.data;
}

/**
 * Bypass a waitlist entry (jump to a different patient).
 * @param {string} id
 * @param {{ reason: string }} data
 */
export async function bypassWaitlistEntry(id, data) {
  const r = await apiClient.patch(`${BASE}/${id}/bypass`, data);
  return r.data.data;
}

/**
 * Expire a waitlist entry (offer window closed).
 * @param {string} id
 */
export async function expireWaitlistEntry(id) {
  const r = await apiClient.patch(`${BASE}/${id}/expire`);
  return r.data.data;
}

/**
 * Remove a patient from the waitlist.
 * @param {string} id
 * @param {{ reason?: string }} data
 */
export async function removeFromWaitlist(id, data = {}) {
  const r = await apiClient.delete(`${BASE}/${id}`, { data });
  return r.data;
}
