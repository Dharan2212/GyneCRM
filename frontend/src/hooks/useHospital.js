/**
 * GyneCRM — useHospital Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useHospital()                       — hospital profile
 *   useHospitalSettings()               — all hospital settings
 *   useBranches(params)                 — branch list
 *
 * Mutation hooks:
 *   useMutationUpdateHospitalSettings() — PUT /hospital/settings (admin)
 *   useMutationCreateBranch()           — POST /branches (forward-compatible)
 *   useMutationUpdateBranch()           — PUT /branches/:id (forward-compatible)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getHospital,
  getHospitalSettings,
  updateHospitalSettings,
  listBranches,
  createBranch,
  updateBranch,
} from '@services/hospitalService';

export function useHospital() {
  return useQuery({
    queryKey: QUERY_KEYS.HOSPITAL,
    queryFn:  () => getHospital(),
    staleTime: 300_000,
  });
}

export function useHospitalSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.HOSPITAL_SETTINGS,
    queryFn:  () => getHospitalSettings(),
    staleTime: 300_000,
  });
}

export function useBranches(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BRANCHES, params],
    queryFn:  () => listBranches(params),
    staleTime: 300_000,
  });
}

export function useMutationUpdateHospitalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings) => updateHospitalSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.HOSPITAL_SETTINGS });
    },
  });
}

export function useMutationCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createBranch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BRANCHES });
    },
  });
}

export function useMutationUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateBranch(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BRANCHES });
    },
  });
}
