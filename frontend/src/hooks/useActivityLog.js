/**
 * GyneCRM — useActivityLog Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * NOTE: Backend does not yet have dedicated /activity-logs or /override-logs
 * endpoints. These hooks are forward-compatible — they will begin working
 * when Phase 9 activates those backend routes.
 *
 * Until then, screens using these hooks will receive a 404 from the backend
 * and must handle the error state gracefully via useQuery's isError flag.
 *
 * Read hooks:
 *   useActivityLogs(params)     — paginated activity log list
 *   useOverrideLogs(params)     — override log list
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listActivityLogs,
  listOverrideLogs,
} from '@services/activityLogService';

/**
 * List activity log entries.
 * Admin only. Forward-compatible (backend route pending Phase 9).
 *
 * @param {{ user_id?, entity_type?, date_from?, date_to?, page?, limit? }} params
 */
export function useActivityLogs(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ACTIVITY_LOGS(params),
    queryFn:  () => listActivityLogs(params),
    staleTime: 60_000,
    retry:    false, // Do not retry while route is pending
  });
}

/**
 * List override log entries.
 * Admin only. Forward-compatible (backend route pending Phase 9).
 *
 * @param {{ action_type?, date_from?, date_to?, page?, limit? }} params
 */
export function useOverrideLogs(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.OVERRIDE_LOGS(params),
    queryFn:  () => listOverrideLogs(params),
    staleTime: 60_000,
    retry:    false,
  });
}
