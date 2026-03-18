/**
 * GyneCRM — Appointment Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/appointments
 * Verified routes:
 *   GET    /appointments               — list with filters
 *   POST   /appointments               — create new appointment
 *   GET    /appointments/:id           — get single appointment
 *   PATCH  /appointments/:id/status    — update status
 *   POST   /appointments/:id/check-in  — dedicated check-in (assigns queue token)
 *   PATCH  /appointments/:id/reschedule — reschedule
 *   DELETE /appointments/:id           — delete (admin only)
 *
 * Slot availability is served via GET /doctors/:id/availability (doctorService).
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List appointments with optional filters.
 * Backend: GET /api/v1/appointments
 * Roles: admin, doctor, receptionist
 *
 * @param {{
 *   date?: string,        — ISO date string (YYYY-MM-DD)
 *   doctor_id?: string,
 *   branch_id?: string,
 *   patient_id?: string,
 *   status?: string,
 *   page?: number,
 *   limit?: number,
 * }} params
 * @returns {Promise<{ appointments: Array, meta: object }>}
 */
export async function listAppointments(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.APPOINTMENTS.LIST, { params });
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Appointment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single appointment by ID.
 * Backend: GET /api/v1/appointments/:id
 *
 * @param {string} id
 * @returns {Promise<object>} — appointment record
 */
export async function getAppointment(id) {
  const response = await apiClient.get(API_ENDPOINTS.APPOINTMENTS.DETAIL(id));
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new appointment.
 * Backend: POST /api/v1/appointments
 * Roles: admin, receptionist
 *
 * @param {object} appointmentData — { patient_id, doctor_id, branch_id, appointment_type_id, scheduled_at, notes? }
 * @returns {Promise<object>} — created appointment
 */
export async function createAppointment(appointmentData) {
  const response = await apiClient.post(API_ENDPOINTS.APPOINTMENTS.CREATE, appointmentData);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Transitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update appointment status.
 * Backend: PATCH /api/v1/appointments/:id/status
 * Roles: admin, doctor, receptionist
 *
 * @param {string} id
 * @param {{ status: string, reason?: string, override_reason?: string }} data
 * @returns {Promise<object>} — updated appointment
 */
export async function updateAppointmentStatus(id, data) {
  const response = await apiClient.patch(API_ENDPOINTS.APPOINTMENTS.STATUS(id), data);
  return response.data.data;
}

/**
 * Check in an appointment (assigns queue token, transitions to checked_in).
 * Backend: POST /api/v1/appointments/:id/check-in
 * Roles: admin, receptionist
 *
 * @param {string} id
 * @returns {Promise<object>} — updated appointment with queue_token
 */
export async function checkInAppointment(id) {
  const response = await apiClient.post(API_ENDPOINTS.APPOINTMENTS.CHECK_IN(id));
  return response.data.data;
}

/**
 * Reschedule an appointment.
 * Backend: PATCH /api/v1/appointments/:id/reschedule
 * Roles: admin, receptionist
 *
 * @param {string} id
 * @param {{ scheduled_at: string, reason?: string }} data
 * @returns {Promise<object>} — new appointment record
 */
export async function rescheduleAppointment(id, data) {
  const response = await apiClient.patch(API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(id), data);
  return response.data.data;
}

/**
 * Delete an appointment (admin only — soft delete).
 * Backend: DELETE /api/v1/appointments/:id
 *
 * @param {string} id
 * @param {string} reason
 * @returns {Promise<{ message: string }>}
 */
export async function deleteAppointment(id, reason) {
  const response = await apiClient.delete(API_ENDPOINTS.APPOINTMENTS.DELETE(id), {
    data: { reason },
  });
  return response.data;
}
