/**
 * GyneCRM — Activity Log Service
 * Phase 8.1 — Domain Service Layer
 *
 * IMPORTANT — Backend Route Status:
 * The current backend does NOT have dedicated /activity-logs or /override-logs
 * endpoints registered in routes/index.js. These tables (activity_logs,
 * override_logs — migrations 043, 044) exist in the database and are written
 * to by backend middleware, but no read API is implemented yet.
 *
 * Phase 9 (Integration Alignment) will confirm and add these routes.
 *
 * Until then this service exports placeholder functions that will work once
 * the backend routes are added. They use the expected future URL patterns.
 *
 * When backend routes are added, NO changes to this service file will be needed —
 * the endpoints will resolve automatically.
 */

import apiClient from './apiClient';

const ACTIVITY_BASE   = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/activity-logs`;
const OVERRIDE_BASE   = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/override-logs`;

/**
 * List activity log entries.
 * Expected backend route (Phase 9): GET /api/v1/activity-logs
 * Admin only.
 *
 * @param {{ user_id?, entity_type?, entity_id?, action?, date_from?, date_to?, branch_id?, page?, limit? }} params
 * @returns {Promise<{ logs: Array, meta: object }>}
 */
export async function listActivityLogs(params = {}) {
  const r = await apiClient.get(ACTIVITY_BASE, { params });
  return r.data.data;
}

/**
 * List override log entries.
 * Expected backend route (Phase 9): GET /api/v1/override-logs
 * Admin only.
 *
 * @param {{ action_type?, date_from?, date_to?, page?, limit? }} params
 * @returns {Promise<{ logs: Array, meta: object }>}
 */
export async function listOverrideLogs(params = {}) {
  const r = await apiClient.get(OVERRIDE_BASE, { params });
  return r.data.data;
}
