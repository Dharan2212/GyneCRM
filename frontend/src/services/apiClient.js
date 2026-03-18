/**
 * GyneCRM — Axios API Client
 * Phase 7.2 — Authentication Infrastructure
 *
 * SECURITY CONTRACT:
 * - Access token lives in memory only
 * - Refresh token is httpOnly cookie
 * - withCredentials: true on every request
 * - Never store access token in localStorage/sessionStorage
 */

import axios from 'axios';

/**
 * Normalize base URL so we never end up with:
 *   /api/v1/api/v1/auth/login
 *
 * Supported usage:
 * 1. VITE_API_BASE_URL=/api/v1
 * 2. VITE_API_BASE_URL=http://localhost:4000/api/v1
 * 3. empty -> defaults to /api/v1
 */
function normalizeBaseUrl(rawBaseUrl) {
  const fallback = '/api/v1';
  const value = (rawBaseUrl || fallback).trim();

  if (!value) return fallback;

  // Remove trailing slash
  return value.replace(/\/+$/, '');
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

// ─────────────────────────────────────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

// ─────────────────────────────────────────────────────────────────────────────
// Token Accessor
// ─────────────────────────────────────────────────────────────────────────────
let _getAccessToken = () => null;
let _onUnauthorized = () => {};

export function configureApiClient(getter, onUnauthorized) {
  _getAccessToken = typeof getter === 'function' ? getter : () => null;
  _onUnauthorized = typeof onUnauthorized === 'function' ? onUnauthorized : () => {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Queue
// ─────────────────────────────────────────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = [];

function _enqueueRequest() {
  return new Promise((resolve, reject) => {
    _refreshQueue.push({ resolve, reject });
  });
}

function _flushQueue(newToken) {
  _refreshQueue.forEach(({ resolve }) => resolve(newToken));
  _refreshQueue = [];
}

function _rejectQueue(error) {
  _refreshQueue.forEach(({ reject }) => reject(error));
  _refreshQueue = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Interceptor
// ─────────────────────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = _getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// Response Interceptor
// ─────────────────────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // If refresh itself failed, force logout
    if (originalRequest.url?.includes('/auth/refresh')) {
      _isRefreshing = false;
      _rejectQueue(error);
      _onUnauthorized();
      return Promise.reject(error);
    }

    // Prevent infinite retry loops
    if (originalRequest._retried) {
      return Promise.reject(error);
    }
    originalRequest._retried = true;

    // Queue while one refresh is already in flight
    if (_isRefreshing) {
      return _enqueueRequest().then((newToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    _isRefreshing = true;

    try {
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const newToken = refreshResponse.data?.data?.accessToken;

      if (!newToken) {
        throw new Error('Refresh response missing accessToken');
      }

      if (typeof window.__gynecrm_onTokenRefreshed === 'function') {
        window.__gynecrm_onTokenRefreshed(newToken);
      }

      _isRefreshing = false;
      _flushQueue(newToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      _isRefreshing = false;
      _rejectQueue(refreshError);
      _onUnauthorized();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;