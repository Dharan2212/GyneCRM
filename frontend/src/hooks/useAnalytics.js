/**
 * GyneCRM — useAnalytics Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * All hooks are admin-only (enforced by backend RBAC).
 *
 * Read hooks:
 *   useAnalyticsOverview(params)        — KPI cards
 *   useAnalyticsRevenue(params)         — revenue breakdown
 *   useAnalyticsAppointments(params)    — appointment trends
 *   useAnalyticsDoctorWorkload(params)  — doctor workload
 *   useAnalyticsPatientRetention(params)
 *   useAnalyticsHighRisk(params)        — high-risk count + list
 *   useAnalyticsTestCompletion(params)
 *   useAnalyticsDeliveries(params)
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getOverview,
  getRevenue,
  getAppointmentStats,
  getDoctorWorkload,
  getPatientRetention,
  getHighRisk,
  getTestCompletion,
  getDeliveryStats,
} from '@services/analyticsService';

export function useAnalyticsOverview(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_OVERVIEW(params),
    queryFn:  () => getOverview(params),
    staleTime: 120_000,
  });
}

export function useAnalyticsRevenue(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_REVENUE(params),
    queryFn:  () => getRevenue(params),
    staleTime: 120_000,
  });
}

export function useAnalyticsAppointments(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_APPOINTMENTS(params),
    queryFn:  () => getAppointmentStats(params),
    staleTime: 120_000,
  });
}

export function useAnalyticsDoctorWorkload(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_WORKLOAD(params),
    queryFn:  () => getDoctorWorkload(params),
    staleTime: 120_000,
  });
}

export function useAnalyticsPatientRetention(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_RETENTION(params),
    queryFn:  () => getPatientRetention(params),
    staleTime: 300_000,
  });
}

export function useAnalyticsHighRisk(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_HIGH_RISK(params),
    queryFn:  () => getHighRisk(params),
    staleTime: 120_000,
  });
}

export function useAnalyticsTestCompletion(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_TEST_COMPLETION(params),
    queryFn:  () => getTestCompletion(params),
    staleTime: 300_000,
  });
}

export function useAnalyticsDeliveries(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ANALYTICS_DELIVERIES(params),
    queryFn:  () => getDeliveryStats(params),
    staleTime: 300_000,
  });
}
