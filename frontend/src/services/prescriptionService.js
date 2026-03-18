/**
 * GyneCRM — Prescription Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/prescriptions
 * Verified routes:
 *   POST   /prescriptions               — create prescription
 *   GET    /prescriptions/:id           — get prescription
 *   PUT    /prescriptions/:id           — update prescription (draft)
 *   POST   /prescriptions/:id/items     — add medicine item
 *   PUT    /prescriptions/:id/items/:itemId  — update item
 *   DELETE /prescriptions/:id/items/:itemId  — remove item
 *   POST   /prescriptions/:id/issue     — issue (lock) prescription, generate PDF
 *   POST   /prescriptions/:id/void      — void prescription (doctor, admin)
 *   POST   /prescriptions/:id/reissue   — reissue voided prescription
 *   GET    /prescriptions/:id/pdf       — get PDF pre-signed URL
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * Create a new prescription (linked to a finalized consultation).
 * @param {object} data — { consultation_id, patient_id, notes? }
 */
export async function createPrescription(data) {
  const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTIONS.CREATE, data);
  return response.data.data;
}

/**
 * Get a prescription by ID.
 * @param {string} id
 */
export async function getPrescription(id) {
  const response = await apiClient.get(API_ENDPOINTS.PRESCRIPTIONS.DETAIL(id));
  return response.data.data;
}

/**
 * Update prescription draft.
 * @param {string} id
 * @param {object} updates
 */
export async function updatePrescription(id, updates) {
  const response = await apiClient.put(API_ENDPOINTS.PRESCRIPTIONS.UPDATE(id), updates);
  return response.data.data;
}

/**
 * Add a medicine item to a prescription.
 * @param {string} id — prescription ID
 * @param {object} item — { medicine_name, dosage, frequency, duration, route, instructions? }
 */
export async function addPrescriptionItem(id, item) {
  const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTIONS.ITEMS(id), item);
  return response.data.data;
}

/**
 * Update an existing prescription item.
 * @param {string} id — prescription ID
 * @param {string} itemId
 * @param {object} updates
 */
export async function updatePrescriptionItem(id, itemId, updates) {
  const response = await apiClient.put(API_ENDPOINTS.PRESCRIPTIONS.ITEM(id, itemId), updates);
  return response.data.data;
}

/**
 * Remove a medicine item from a prescription.
 * @param {string} id
 * @param {string} itemId
 */
export async function removePrescriptionItem(id, itemId) {
  const response = await apiClient.delete(API_ENDPOINTS.PRESCRIPTIONS.ITEM(id, itemId));
  return response.data;
}

/**
 * Issue (lock) a prescription and trigger PDF generation.
 * @param {string} id
 */
export async function issuePrescription(id) {
  const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTIONS.ISSUE(id));
  return response.data.data;
}

/**
 * Void a prescription with a mandatory reason.
 * @param {string} id
 * @param {{ reason: string }} data
 */
export async function voidPrescription(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTIONS.VOID(id), data);
  return response.data.data;
}

/**
 * Get a pre-signed S3 URL for the prescription PDF.
 * @param {string} id
 * @returns {Promise<{ url: string, expires_in: number }>}
 */
export async function getPrescriptionPdf(id) {
  const response = await apiClient.get(API_ENDPOINTS.PRESCRIPTIONS.PDF(id));
  return response.data.data;
}
