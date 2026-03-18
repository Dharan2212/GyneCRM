/**
 * GyneCRM — usePregnancies Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   usePregnancy(id)                  — single pregnancy record
 *   usePregnancyMilestones(id)        — milestone list for a pregnancy
 *
 * Mutation hooks:
 *   useMutationCreatePregnancy()      — POST /pregnancies
 *   useMutationUpdatePregnancy()      — PUT /pregnancies/:id
 *   useMutationToggleHighRisk()       — PATCH /pregnancies/:id/high-risk
 *   useMutationClosePregnancy()       — POST /pregnancies/:id/close
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getPregnancy,
  getPregnancyMilestones,
  createPregnancy,
  updatePregnancy,
  toggleHighRisk,
  closePregnancy,
} from '@services/pregnancyService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single pregnancy by ID.
 *
 * @param {string | null | undefined} id
 */
export function usePregnancy(id) {
  return useQuery({
    queryKey: QUERY_KEYS.PREGNANCY(id),
    queryFn:  () => getPregnancy(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

/**
 * Fetch milestone list for a pregnancy.
 *
 * @param {string | null | undefined} pregnancyId
 */
export function usePregnancyMilestones(pregnancyId) {
  return useQuery({
    queryKey: QUERY_KEYS.PREGNANCY_MILESTONES(pregnancyId),
    queryFn:  () => getPregnancyMilestones(pregnancyId),
    enabled:  !!pregnancyId,
    staleTime: 300_000, // milestones change slowly
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new pregnancy record.
 * On success: invalidates patient profile and pregnancies list.
 */
export function useMutationCreatePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createPregnancy(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREGNANCIES });
      // Also invalidate the patient profile so pregnancy indicator refreshes
      if (result?.patient_id) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT(result.patient_id) });
      }
    },
  });
}

/**
 * Update a pregnancy record.
 */
export function useMutationUpdatePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updatePregnancy(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREGNANCY(variables.id) });
    },
  });
}

/**
 * Toggle the high-risk flag (with mandatory override reason captured by OverrideModal).
 * On success: invalidates pregnancy record and analytics high-risk count.
 */
export function useMutationToggleHighRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_high_risk, reason }) => toggleHighRisk(id, { is_high_risk, reason }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREGNANCY(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.HIGH_RISK });
    },
  });
}

/**
 * Close a pregnancy record.
 * On success: invalidates pregnancy and patient profile.
 */
export function useMutationClosePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => closePregnancy(id, data),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREGNANCY(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREGNANCIES });
    },
  });
}
