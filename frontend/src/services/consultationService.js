/**
 * GyneCRM — Consultation Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/consultations
 * Verified routes:
 *   POST   /consultations           — create consultation (doctor, admin)
 *   GET    /consultations/:id       — get single consultation
 *   PUT    /consultations/:id       — update / autosave draft
 *   POST   /consultations/:id/finalize   — lock consultation record
 *   POST   /consultations/:id/override   — clinical override with reason
 *   GET    /consultations/:id/pdf        — get consultation PDF (pre-signed URL)
 *
 * NOTE: No GET / (list all) endpoint exists in the current backend for consultations.
 * Patient-specific consultation history is served by the patient profile query or
 * will be added in Phase 9 integration alignment.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new consultation (auto-creates as draft on open).
 * Backend: POST /api/v1/consultations
 * Roles: doctor, admin
 *
 * @param {object} consultationData — {
 *   appointment_id,
 *   patient_id,
 *   pregnancy_id?,
 *   vitals?,
 *   obstetric_notes?,
 *   symptoms?,
 *   diagnosis_tags?,
 *   diagnosis_notes?,
 *   treatment_plan?,
 *   outcome?,
 *   follow_up_date?,
 * }
 * @returns {Promise<object>} — created consultation
 */
export async function createConsultation(consultationData) {
  const response = await apiClient.post(API_ENDPOINTS.CONSULTATIONS.CREATE, consultationData);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a consultation record by ID.
 * Backend: GET /api/v1/consultations/:id
 * Roles: doctor, admin
 *
 * @param {string} id
 * @returns {Promise<object>} — consultation record
 */
export async function getConsultation(id) {
  const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS.DETAIL(id));
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update (Draft Autosave)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update / autosave a draft consultation.
 * Backend: PUT /api/v1/consultations/:id
 * Roles: doctor, admin
 * Only works on consultations with status = draft or in_progress.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>} — updated consultation
 */
export async function updateConsultation(id, updates) {
  const response = await apiClient.put(API_ENDPOINTS.CONSULTATIONS.UPDATE(id), updates);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finalize a consultation — locks the record and triggers automation events.
 * Backend: POST /api/v1/consultations/:id/finalize
 * Roles: doctor, admin
 *
 * @param {string} id
 * @param {object} finalData — final state of the consultation before lock
 * @returns {Promise<object>} — finalized consultation
 */
export async function finalizeConsultation(id, finalData = {}) {
  const response = await apiClient.post(API_ENDPOINTS.CONSULTATIONS.FINALIZE(id), finalData);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Override
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a clinical override with mandatory reason.
 * Logged to override_logs with full audit trail.
 * Backend: POST /api/v1/consultations/:id/override
 * Roles: doctor, admin
 *
 * @param {string} id
 * @param {{ override_reason: string, override_action: string, updates: object }} data
 * @returns {Promise<object>}
 */
export async function overrideConsultation(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.CONSULTATIONS.OVERRIDE(id), data);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a pre-signed S3 URL for the consultation PDF.
 * Backend: GET /api/v1/consultations/:id/pdf
 * Roles: doctor, admin
 *
 * @param {string} id
 * @returns {Promise<{ url: string, expires_in: number }>}
 */
export async function getConsultationPdf(id) {
  const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS.PDF(id));
  return response.data.data;
}
