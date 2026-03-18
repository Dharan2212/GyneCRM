/**
 * GyneCRM — Patient Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/patients
 * Verified routes:
 *   GET    /patients               — list + search (phone, name query params)
 *   POST   /patients               — register new patient
 *   GET    /patients/:id           — get full patient profile
 *   PUT    /patients/:id           — update patient details
 *   DELETE /patients/:id           — soft delete (admin only)
 *   GET    /patients/:id/medical-history  — get medical history
 *   PUT    /patients/:id/medical-history  — update medical history (via patients controller)
 *   GET    /patients/:id/consents         — list consents
 *   POST   /patients/:id/consents         — record new consent (via patients controller)
 *
 * All functions return response.data.data (unwrapped from backend envelope).
 * Callers receive the payload directly; error handling is via thrown AxiosError.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// List / Search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search patients by phone or name, or list with pagination.
 * Backend: GET /api/v1/patients
 *
 * @param {{ phone?: string, name?: string, page?: number, limit?: number }} params
 * @returns {Promise<{ patients: Array, meta: { total, page, limit, total_pages } }>}
 */
export async function searchPatients(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.PATIENTS.LIST, { params });
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Patient
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get full patient profile by ID.
 * Backend: GET /api/v1/patients/:id
 *
 * @param {string} id — patient UUID
 * @returns {Promise<object>} — patient record
 */
export async function getPatient(id) {
  const response = await apiClient.get(API_ENDPOINTS.PATIENTS.DETAIL(id));
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update / Delete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new patient.
 * Backend: POST /api/v1/patients
 * Roles: admin, receptionist
 *
 * @param {object} patientData — { full_name, phone, dob, blood_group, address, family_whatsapp, consents }
 * @returns {Promise<object>} — created patient record
 */
export async function registerPatient(patientData) {
  const response = await apiClient.post(API_ENDPOINTS.PATIENTS.CREATE, patientData);
  return response.data.data;
}

/**
 * Update patient demographics.
 * Backend: PUT /api/v1/patients/:id
 * Roles: admin, receptionist
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>} — updated patient record
 */
export async function updatePatient(id, updates) {
  const response = await apiClient.put(API_ENDPOINTS.PATIENTS.UPDATE(id), updates);
  return response.data.data;
}

/**
 * Soft delete a patient.
 * Backend: DELETE /api/v1/patients/:id
 * Roles: admin only
 *
 * @param {string} id
 * @param {string} reason — mandatory reason for audit log
 * @returns {Promise<{ message: string }>}
 */
export async function deletePatient(id, reason) {
  const response = await apiClient.delete(API_ENDPOINTS.PATIENTS.DELETE(id), {
    data: { reason },
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Medical History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get patient medical history.
 * Backend: GET /api/v1/patients/:id/medical-history
 *
 * @param {string} patientId
 * @returns {Promise<object>} — medical history record
 */
export async function getPatientMedicalHistory(patientId) {
  const response = await apiClient.get(API_ENDPOINTS.PATIENTS.HISTORY(patientId));
  return response.data.data;
}

/**
 * Update patient medical history.
 * Backend: PUT /api/v1/patients/:id/medical-history (via patients controller)
 * NOTE: Backend handles this via the patients module — confirm exact route if issues arise.
 *
 * @param {string} patientId
 * @param {object} historyData — { conditions, allergies, surgical_history, notes }
 * @returns {Promise<object>} — updated record
 */
export async function updatePatientMedicalHistory(patientId, historyData) {
  const response = await apiClient.put(API_ENDPOINTS.PATIENTS.HISTORY(patientId), historyData);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consents
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all consent records for a patient.
 * Backend: GET /api/v1/patients/:id/consents
 *
 * @param {string} patientId
 * @returns {Promise<Array>} — list of consent records
 */
export async function getPatientConsents(patientId) {
  const response = await apiClient.get(API_ENDPOINTS.PATIENTS.CONSENTS(patientId));
  return response.data.data;
}

/**
 * Record a new consent for a patient.
 * Backend: POST /api/v1/patients/:id/consents
 * Roles: admin, receptionist
 *
 * @param {string} patientId
 * @param {object} consentData — { consent_type, consented, notes? }
 * @returns {Promise<object>} — created consent record
 */
export async function recordConsent(patientId, consentData) {
  const response = await apiClient.post(API_ENDPOINTS.PATIENTS.CONSENTS(patientId), consentData);
  return response.data.data;
}
