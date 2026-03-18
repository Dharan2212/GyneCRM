/**
 * GyneCRM — User Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/users
 * Verified routes (all admin-only):
 *   GET    /users              — list users with role/branch filters
 *   POST   /users              — create new staff user
 *   GET    /users/:id          — get single user
 *   PUT    /users/:id          — update user details
 *   PATCH  /users/:id/activate   — activate user
 *   PATCH  /users/:id/deactivate — deactivate user
 *
 * NOTE: No /users/me endpoint in current backend routes.
 * Own profile is embedded in the auth response.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

const BASE = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/users`;

/**
 * List users with optional role/branch/status filters.
 * Admin only.
 * @param {{ role?, branch_id?, is_active?, page?, limit? }} params
 */
export async function listUsers(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.USERS.LIST, { params });
  return r.data.data;
}

/**
 * Get a single user by ID.
 * Admin only.
 * @param {string} id
 */
export async function getUser(id) {
  const r = await apiClient.get(API_ENDPOINTS.USERS.DETAIL(id));
  return r.data.data;
}

/**
 * Create a new staff user.
 * Admin only.
 * @param {{ name, email, role, branch_id?, password, doctor_profile? }} data
 */
export async function createUser(data) {
  const r = await apiClient.post(API_ENDPOINTS.USERS.CREATE, data);
  return r.data.data;
}

/**
 * Update a user's details.
 * Admin only.
 * @param {string} id
 * @param {{ name?, role?, branch_id? }} updates
 */
export async function updateUser(id, updates) {
  const r = await apiClient.put(API_ENDPOINTS.USERS.UPDATE(id), updates);
  return r.data.data;
}

/**
 * Activate a deactivated user.
 * Admin only.
 * @param {string} id
 */
export async function activateUser(id) {
  const r = await apiClient.patch(`${BASE}/${id}/activate`);
  return r.data.data;
}

/**
 * Deactivate a user (soft — preserves historical records).
 * Admin only.
 * @param {string} id
 * @param {{ reason: string }} data
 */
export async function deactivateUser(id, data) {
  const r = await apiClient.patch(API_ENDPOINTS.USERS.DEACTIVATE(id), data);
  return r.data.data;
}
