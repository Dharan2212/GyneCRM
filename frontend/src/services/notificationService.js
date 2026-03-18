/**
 * GyneCRM — Notification Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/notifications
 * Verified routes:
 *   GET    /notifications                  — list (admin, doctor)
 *   GET    /notifications/failed           — failed list for retry (admin)
 *   GET    /notifications/automation-status — automation health check (admin)
 *   GET    /notifications/:id              — single notification (admin, doctor)
 *   POST   /notifications/:id/retry        — retry failed notification (admin)
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * List notifications with optional filters.
 * @param {{ patient_id?, event_type?, status?, date_from?, date_to?, page?, limit? }} params
 */
export async function listNotifications(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params });
  return r.data.data;
}

/**
 * Get failed notifications (for admin retry dashboard).
 * @param {{ page?, limit? }} params
 */
export async function listFailedNotifications(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.FAILED, { params });
  return r.data.data;
}

/**
 * Get automation health status.
 */
export async function getAutomationStatus() {
  const r = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.AUTOMATION_STATUS);
  return r.data.data;
}

/**
 * Get a single notification record.
 * @param {string} id
 */
export async function getNotification(id) {
  const r = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.DETAIL(id));
  return r.data.data;
}

/**
 * Retry a failed notification.
 * Admin only.
 * @param {string} id
 */
export async function retryNotification(id) {
  const r = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.RETRY(id));
  return r.data.data;
}
