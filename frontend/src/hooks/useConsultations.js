/**
 * GyneCRM — useConsultations Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useConsultation(id)                   — single consultation record
 *
 * Mutation hooks:
 *   useMutationCreateConsultation()        — POST /consultations
 *   useMutationUpdateConsultation()        — PUT /consultations/:id (autosave)
 *   useMutationFinalizeConsultation()      — POST /consultations/:id/finalize
 *   useMutationOverrideConsultation()      — POST /consultations/:id/override
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getConsultation,
  createConsultation,
  updateConsultation,
  finalizeConsultation,
  overrideConsultation,
} from '@services/consultationService';
import {
  createPrescription,
  getPrescription,
  updatePrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  removePrescriptionItem,
  issuePrescription,
  voidPrescription,
  getPrescriptionPdf,
} from '@services/prescriptionService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single consultation record.
 *
 * @param {string | null | undefined} id
 */
export function useConsultation(id) {
  return useQuery({
    queryKey: QUERY_KEYS.CONSULTATION(id),
    queryFn:  () => getConsultation(id),
    enabled:  !!id,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single prescription record.
 *
 * @param {string | null | undefined} id
 */
export function usePrescription(id) {
  return useQuery({
    queryKey: QUERY_KEYS.PRESCRIPTION(id),
    queryFn:  () => getPrescription(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultation Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new consultation (auto-creates as draft on patient open).
 */
export function useMutationCreateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createConsultation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CONSULTATIONS });
    },
  });
}

/**
 * Update / autosave a draft consultation.
 * Uses silent background mutation — no loading state surfaced in UI.
 */
export function useMutationUpdateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateConsultation(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CONSULTATION(variables.id) });
    },
  });
}

/**
 * Finalize a consultation — locks the record.
 * On success: invalidates both consultation and the patient's appointments
 * (appointment status transitions to completed after finalization).
 */
export function useMutationFinalizeConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...finalData }) => finalizeConsultation(id, finalData),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CONSULTATION(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CONSULTATIONS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
    },
  });
}

/**
 * Apply a clinical override with mandatory reason.
 */
export function useMutationOverrideConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => overrideConsultation(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CONSULTATION(variables.id) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a prescription linked to a consultation.
 */
export function useMutationCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createPrescription(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTIONS });
    },
  });
}

/**
 * Update a draft prescription.
 */
export function useMutationUpdatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updatePrescription(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(variables.id) });
    },
  });
}

/**
 * Add a medicine item to a prescription.
 */
export function useMutationAddPrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prescriptionId, item }) => addPrescriptionItem(prescriptionId, item),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(variables.prescriptionId) });
    },
  });
}

/**
 * Update a prescription item.
 */
export function useMutationUpdatePrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prescriptionId, itemId, updates }) =>
      updatePrescriptionItem(prescriptionId, itemId, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(variables.prescriptionId) });
    },
  });
}

/**
 * Remove a medicine item.
 */
export function useMutationRemovePrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prescriptionId, itemId }) =>
      removePrescriptionItem(prescriptionId, itemId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(variables.prescriptionId) });
    },
  });
}

/**
 * Issue (lock) a prescription and generate PDF.
 */
export function useMutationIssuePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => issuePrescription(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTIONS });
    },
  });
}

/**
 * Void a prescription.
 */
export function useMutationVoidPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => voidPrescription(id, { reason }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRESCRIPTION(variables.id) });
    },
  });
}

/**
 * Get prescription PDF URL (not a mutation — returns URL for download).
 * Used as a one-off async call rather than a query hook.
 */
export { getPrescriptionPdf };
