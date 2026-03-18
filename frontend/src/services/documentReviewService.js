/**
 * GyneCRM — Document Review Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/documents (review side)
 * Verified routes (documentReview.routes.js — mounted first under /documents):
 *   GET    /documents/review-inbox     — pending review list (doctor, admin)
 *   GET    /documents/:id              — get single document record (all roles)
 *   POST   /documents/:id/review       — submit review (doctor, admin)
 *   POST   /documents/:id/flag         — flag document as abnormal (doctor, admin)
 *   DELETE /documents/:id              — soft delete (admin only)
 *
 * All review operations require authentication and hospital scope.
 * Doctor sees only patients under their hospital; admin sees all.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * Get the doctor review inbox — documents with pending_review status.
 * Backend: GET /api/v1/documents/review-inbox
 * Roles: doctor, admin
 *
 * @param {{ page?: number, limit?: number, document_type?: string, severity?: string }} params
 * @returns {Promise<{ documents: Array, meta: object }>}
 */
export async function getReviewInbox(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.REVIEW_INBOX, { params });
  return response.data.data;
}

/**
 * Get a single document record (metadata + review status).
 * Backend: GET /api/v1/documents/:id
 * Roles: admin, doctor, receptionist, staff
 *
 * @param {string} id
 * @returns {Promise<object>} — document record with review metadata
 */
export async function getDocument(id) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.REVIEW_DETAIL(id));
  return response.data.data;
}

/**
 * Submit a review for a document.
 * Backend: POST /api/v1/documents/:id/review
 * Roles: doctor, admin
 *
 * @param {string} id
 * @param {{ review_notes?: string, extracted_values?: object, review_status: string }} data
 * @returns {Promise<object>} — updated document with review
 */
export async function reviewDocument(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.SUBMIT_REVIEW(id), data);
  return response.data.data;
}

/**
 * Flag a document as abnormal with severity.
 * Backend: POST /api/v1/documents/:id/flag
 * Roles: doctor, admin
 *
 * @param {string} id
 * @param {{ flag_reason: string, flag_severity: 'normal' | 'high' | 'critical', extracted_values?: object }} data
 * @returns {Promise<object>} — updated document record
 */
export async function flagDocument(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.FLAG(id), data);
  return response.data.data;
}

/**
 * Soft delete a document.
 * Backend: DELETE /api/v1/documents/:id
 * Roles: admin only
 *
 * @param {string} id
 * @param {{ reason: string }} data
 * @returns {Promise<{ message: string }>}
 */
export async function deleteDocument(id, data) {
  const response = await apiClient.delete(API_ENDPOINTS.DOCUMENTS.DELETE(id), { data });
  return response.data;
}
