/**
 * GyneCRM — Doctor Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/doctors
 * Verified routes:
 *   GET    /doctors              — list (admin, doctor, receptionist)
 *   POST   /doctors              — create doctor profile (admin)
 *   GET    /doctors/:id          — get doctor detail (admin, doctor, receptionist)
 *   PUT    /doctors/:id          — update doctor (admin)
 *   GET    /doctors/:id/schedule — get weekly schedule settings (admin, doctor, receptionist)
 *   PUT    /doctors/:id/schedule — update schedule settings (admin)
 *   GET    /doctors/:id/availability — get available appointment slots (admin, doctor, receptionist)
 *
 * NOTE: /leaves, /blocks, /branch-assignments are defined in DOCTORS constants
 * but not confirmed in the real routes file — these endpoints may need Phase 9 verification.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/doctors`;

/**
 * List doctors for the hospital with optional branch filter.
 * @param {{ branch_id?, is_active?, page?, limit? }} params
 */
export async function listDoctors(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.DOCTORS.LIST, { params });
  return r.data.data;
}

/**
 * Get a doctor's full profile.
 * @param {string} id
 */
export async function getDoctor(id) {
  const r = await apiClient.get(API_ENDPOINTS.DOCTORS.DETAIL(id));
  return r.data.data;
}

/**
 * Create a doctor profile (linked to an existing user).
 * Admin only.
 * @param {{ user_id, specialty, qualifications, registration_number, consultation_fee?, color_code? }} data
 */
export async function createDoctor(data) {
  const r = await apiClient.post(API_ENDPOINTS.DOCTORS.CREATE, data);
  return r.data.data;
}

/**
 * Update a doctor profile.
 * Admin only.
 * @param {string} id
 * @param {object} updates
 */
export async function updateDoctor(id, updates) {
  const r = await apiClient.put(API_ENDPOINTS.DOCTORS.UPDATE(id), updates);
  return r.data.data;
}

/**
 * Get a doctor's weekly schedule settings.
 * @param {string} id
 */
export async function getDoctorSchedule(id) {
  const r = await apiClient.get(API_ENDPOINTS.DOCTORS.SCHEDULE(id));
  return r.data.data;
}

/**
 * Update (upsert) a doctor's schedule settings.
 * Admin only.
 * @param {string} id
 * @param {object} scheduleData — { slots: Array, slot_duration_minutes, buffer_minutes }
 */
export async function updateDoctorSchedule(id, scheduleData) {
  const r = await apiClient.put(API_ENDPOINTS.DOCTORS.SCHEDULE(id), scheduleData);
  return r.data.data;
}

/**
 * Get available appointment slots for a doctor on a given date.
 * Backend: GET /api/v1/doctors/:id/availability
 * @param {string} id
 * @param {{ date: string, appointment_type_id?: string }} params
 */
export async function getDoctorAvailability(id, params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.DOCTORS.AVAILABILITY(id), { params });
  return r.data.data;
}
