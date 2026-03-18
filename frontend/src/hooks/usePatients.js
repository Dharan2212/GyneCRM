/**
 * GyneCRM — usePatients Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Provides TanStack Query wrappers for all patient operations.
 * Screens import these hooks directly — no service calls in components.
 *
 * Read hooks:
 *   usePatientSearch(params)          — debounced patient search / list
 *   usePatient(id)                    — single patient profile
 *   usePatientMedicalHistory(id)      — medical history record
 *   usePatientConsents(id)            — consent records list
 *
 * Mutation hooks:
 *   useMutationRegisterPatient()      — POST /patients
 *   useMutationUpdatePatient()        — PUT /patients/:id
 *   useMutationUpdateMedicalHistory() — PUT /patients/:id/medical-history
 *   useMutationRecordConsent()        — POST /patients/:id/consents
 *   useMutationDeletePatient()        — DELETE /patients/:id (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  searchPatients,
  getPatient,
  getPatientMedicalHistory,
  getPatientConsents,
  registerPatient,
  updatePatient,
  updatePatientMedicalHistory,
  recordConsent,
  deletePatient,
} from '@services/patientService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search / list patients.
 * Enabled when params.phone or params.name is provided (or explicitly enabled).
 *
 * @param {{ phone?: string, name?: string, page?: number, limit?: number }} params
 * @param {{ enabled?: boolean }} options
 */
export function usePatientSearch(params = {}, options = {}) {
  const hasQuery = !!(params.phone || params.name);
  return useQuery({
    queryKey: [...QUERY_KEYS.PATIENTS, params],
    queryFn:  () => searchPatients(params),
    enabled:  options.enabled !== undefined ? options.enabled : hasQuery,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single patient by ID.
 * Enabled only when id is truthy.
 *
 * @param {string | null | undefined} id
 */
export function usePatient(id) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT(id),
    queryFn:  () => getPatient(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

/**
 * Fetch medical history for a patient.
 *
 * @param {string | null | undefined} patientId
 */
export function usePatientMedicalHistory(patientId) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_HISTORY(patientId),
    queryFn:  () => getPatientMedicalHistory(patientId),
    enabled:  !!patientId,
    staleTime: 120_000,
  });
}

/**
 * Fetch consent records for a patient.
 *
 * @param {string | null | undefined} patientId
 */
export function usePatientConsents(patientId) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_CONSENTS(patientId),
    queryFn:  () => getPatientConsents(patientId),
    enabled:  !!patientId,
    staleTime: 120_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new patient.
 * On success: invalidates patient list.
 */
export function useMutationRegisterPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => registerPatient(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
    },
  });
}

/**
 * Update patient demographics.
 * On success: invalidates patient list and the specific patient record.
 *
 * @param {string} patientId
 */
export function useMutationUpdatePatient(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => updatePatient(patientId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT(patientId) });
    },
  });
}

/**
 * Update patient medical history.
 *
 * @param {string} patientId
 */
export function useMutationUpdateMedicalHistory(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (historyData) => updatePatientMedicalHistory(patientId, historyData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_HISTORY(patientId) });
    },
  });
}

/**
 * Record a consent for a patient.
 *
 * @param {string} patientId
 */
export function useMutationRecordConsent(patientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (consentData) => recordConsent(patientId, consentData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_CONSENTS(patientId) });
    },
  });
}

/**
 * Soft delete a patient (admin only).
 */
export function useMutationDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => deletePatient(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
    },
  });
}
