/**
 * GyneCRM — Analytics Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/analytics
 * Verified routes (admin only — roleCheck(['Admin']) with capital A in analytics.routes.js):
 *   GET /analytics/overview           — KPI cards
 *   GET /analytics/revenue            — revenue by date range and mode
 *   GET /analytics/appointments       — appointment stats and trends
 *   GET /analytics/doctor-workload    — consultations per doctor
 *   GET /analytics/patient-retention  — retention metric
 *   GET /analytics/high-risk          — high-risk pregnancy count + list
 *   GET /analytics/test-completion    — test result upload rate
 *   GET /analytics/day-close          — day close summaries
 *   GET /analytics/deliveries         — delivery stats and trends
 *   GET /analytics/branch/:branchId   — per-branch KPIs
 *
 * All return { success, data: { ... } } envelope.
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * Get dashboard KPI overview.
 * @param {{ branch_id?, date? }} params
 */
export async function getOverview(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.OVERVIEW, { params });
  return r.data.data;
}

/**
 * Get revenue summary.
 * @param {{ date_from?, date_to?, branch_id? }} params
 */
export async function getRevenue(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.REVENUE, { params });
  return r.data.data;
}

/**
 * Get appointment statistics and trends.
 * @param {{ date_from?, date_to?, branch_id?, doctor_id? }} params
 */
export async function getAppointmentStats(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.APPOINTMENTS, { params });
  return r.data.data;
}

/**
 * Get doctor workload (consultations per doctor).
 * @param {{ weeks?, branch_id? }} params
 */
export async function getDoctorWorkload(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.DOCTOR_WORKLOAD, { params });
  return r.data.data;
}

/**
 * Get patient retention metric.
 * @param {{ branch_id? }} params
 */
export async function getPatientRetention(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.PATIENT_RETENTION, { params });
  return r.data.data;
}

/**
 * Get high-risk pregnancy count and list.
 * @param {{ branch_id?, doctor_id? }} params
 */
export async function getHighRisk(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.HIGH_RISK, { params });
  return r.data.data;
}

/**
 * Get test completion rate.
 * @param {{ date_from?, date_to?, branch_id? }} params
 */
export async function getTestCompletion(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.TEST_COMPLETION, { params });
  return r.data.data;
}

/**
 * Get day close summaries.
 * @param {{ date_from?, date_to?, branch_id? }} params
 */
export async function getDayClose(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.DAY_CLOSE, { params });
  return r.data.data;
}

/**
 * Get delivery statistics.
 * @param {{ date_from?, date_to?, branch_id? }} params
 */
export async function getDeliveryStats(params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.DELIVERIES, { params });
  return r.data.data;
}

/**
 * Get per-branch analytics.
 * @param {string} branchId
 * @param {{ date_from?, date_to? }} params
 */
export async function getBranchAnalytics(branchId, params = {}) {
  const r = await apiClient.get(API_ENDPOINTS.ANALYTICS.BRANCH(branchId), { params });
  return r.data.data;
}
