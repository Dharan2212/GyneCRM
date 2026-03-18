/**
 * GyneCRM — useNotifications Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useNotificationList(params)     — paginated list with filters
 *   useFailedNotifications(params)  — failed list for retry dashboard
 *   useAutomationStatus()           — automation health check
 *   useNotification(id)             — single notification record
 *
 * Mutation hooks:
 *   useMutationRetryNotification()  — POST /notifications/:id/retry (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listNotifications,
  listFailedNotifications,
  getAutomationStatus,
  getNotification,
  retryNotification,
} from '@services/notificationService';

export function useNotificationList(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, params],
    queryFn:  () => listNotifications(params),
    staleTime: 60_000,
  });
}

export function useFailedNotifications(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS_FAILED, params],
    queryFn:  () => listFailedNotifications(params),
    staleTime: 30_000,
  });
}

export function useAutomationStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.AUTOMATION_STATUS,
    queryFn:  () => getAutomationStatus(),
    staleTime: 300_000,
  });
}

export function useNotification(id) {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATION(id),
    queryFn:  () => getNotification(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useMutationRetryNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => retryNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS_FAILED });
    },
  });
}
