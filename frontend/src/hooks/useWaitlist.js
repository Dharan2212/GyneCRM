/**
 * GyneCRM — useWaitlist Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * NOTE: Backend does not yet have dedicated /waitlist endpoints.
 * These hooks are forward-compatible and will begin working in Phase 9.
 * Screens using these hooks must handle error state gracefully.
 *
 * Read hooks:
 *   useWaitlist(params)                 — paginated waitlist list
 *
 * Mutation hooks:
 *   useMutationAddToWaitlist()          — POST /waitlist
 *   useMutationOfferSlot()              — PATCH /waitlist/:id/offer
 *   useMutationWaitlistAction()         — generic action (accept/bypass/expire)
 *   useMutationRemoveFromWaitlist()     — DELETE /waitlist/:id
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listWaitlist,
  addToWaitlist,
  offerSlot,
  acceptWaitlistEntry,
  bypassWaitlistEntry,
  expireWaitlistEntry,
  removeFromWaitlist,
} from '@services/waitlistService';

export function useWaitlist(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.WAITLIST(params),
    queryFn:  () => listWaitlist(params),
    staleTime: 30_000,
    retry:    false,
  });
}

export function useMutationAddToWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => addToWaitlist(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'waitlist'] });
    },
  });
}

export function useMutationOfferSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => offerSlot(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'waitlist'] });
    },
  });
}

/**
 * Generic waitlist action (accept / bypass / expire).
 * Pass action: 'accept' | 'bypass' | 'expire'
 */
export function useMutationWaitlistAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }) => {
      switch (action) {
        case 'accept':  return acceptWaitlistEntry(id);
        case 'bypass':  return bypassWaitlistEntry(id, { reason });
        case 'expire':  return expireWaitlistEntry(id);
        default: throw new Error(`Unknown waitlist action: ${action}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'waitlist'] });
    },
  });
}

export function useMutationRemoveFromWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => removeFromWaitlist(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'waitlist'] });
    },
  });
}
