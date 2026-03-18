/**
 * GyneCRM — Auth Service
 * Phase 7.2 — Authentication Infrastructure
 *
 * IMPORTANT:
 * - apiClient baseURL should already be '/api/v1'
 * - So endpoint constants here must be:
 *   '/auth/login'
 *   '/auth/logout'
 *   '/auth/refresh'
 *   '/auth/change-password'
 * - Do NOT include '/api/v1' here again
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * Login
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ accessToken: string, user: object }>}
 */
export async function login({ email, password }) {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
    email: email.trim().toLowerCase(),
    password,
  });

  return response.data.data;
}

/**
 * Logout
 * Best-effort only. Local auth state should still be cleared by AuthContext.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch {
    // ignore network/logout API failure
  }
}

/**
 * Refresh session using httpOnly refresh cookie
 * @returns {Promise<{ accessToken: string, user?: object }>}
 */
export async function refresh() {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
  return response.data.data;
}

/**
 * Change current password
 * @param {{ currentPassword: string, newPassword: string }} data
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
    currentPassword,
    newPassword,
  });

  return response.data;
}