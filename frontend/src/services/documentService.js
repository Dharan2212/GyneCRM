/**
 * GyneCRM — Document Service
 * Domain Service Layer
 *
 * Uses API_ENDPOINTS from src/constants/index.js
 * Works with apiClient baseURL = /api/v1
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// Upload Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 1: Request a pre-signed S3 upload URL.
 * Backend: POST /documents/upload-url
 */
export async function getUploadUrl(data) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.UPLOAD_URL, data);
  return response.data.data;
}

/**
 * Step 2: Upload file directly to S3 using the pre-signed URL.
 * This does NOT go through apiClient.
 */
export async function uploadFileToS3(presignedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('S3 upload failed (network error)'));

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Step 3: Create document metadata after S3 upload.
 * Backend: POST /documents
 */
export async function createDocument(data) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.CREATE, data);
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List documents
 * Backend may support query params depending on implementation
 */
export async function listDocuments(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.LIST, { params });
  return response.data.data;
}

/**
 * Get a time-limited pre-signed S3 URL for document viewing/downloading
 * Backend: GET /documents/:id/url
 */
export async function getDocumentUrl(id) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.DETAIL_URL(id));
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Review inbox
 * Backend: GET /documents/review-inbox
 */
export async function getReviewInbox(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.REVIEW_INBOX, { params });
  return response.data.data;
}

/**
 * Review detail
 * Backend: GET /documents/:id
 */
export async function getReviewDetail(id) {
  const response = await apiClient.get(API_ENDPOINTS.DOCUMENTS.REVIEW_DETAIL(id));
  return response.data.data;
}

/**
 * Submit review decision
 * Backend: POST /documents/:id/review
 */
export async function submitReview(id, payload) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.SUBMIT_REVIEW(id), payload);
  return response.data.data;
}

/**
 * Flag a document
 * Backend: POST /documents/:id/flag
 */
export async function flagDocument(id, payload = {}) {
  const response = await apiClient.post(API_ENDPOINTS.DOCUMENTS.FLAG(id), payload);
  return response.data.data;
}

/**
 * Delete a document
 * Backend: DELETE /documents/:id
 */
export async function deleteDocument(id) {
  const response = await apiClient.delete(API_ENDPOINTS.DOCUMENTS.DELETE(id));
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export object
// ─────────────────────────────────────────────────────────────────────────────

const documentService = {
  getUploadUrl,
  uploadFileToS3,
  createDocument,
  listDocuments,
  getDocumentUrl,
  getReviewInbox,
  getReviewDetail,
  submitReview,
  flagDocument,
  deleteDocument,
};

export default documentService;