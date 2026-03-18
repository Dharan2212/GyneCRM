/**
 * GyneCRM — useAppointments Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useAppointmentList(params)        — filtered appointment list (with auto-refetch for queue)
 *   useAppointment(id)                — single appointment
 *   useDoctorAvailability(doctorId, date) — available slots for booking
 *
 * Mutation hooks:
 *   useMutationCreateAppointment()    — POST /appointments
 *   useMutationUpdateStatus()         — PATCH /appointments/:id/status
 *   useMutationCheckIn()              — POST /appointments/:id/check-in
 *   useMutationReschedule()           — PATCH /appointments/:id/reschedule
 *   useMutationDeleteAppointment()    — DELETE /appointments/:id (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
  deleteAppointment,
} from '@services/appointmentService';
import { getDoctorAvailability } from '@services/doctorService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List appointments with filters.
 * Use refetchInterval for live queue screens (e.g. 30 seconds).
 *
 * @param {object} params — { date, doctor_id, branch_id, patient_id, status, page, limit }
 * @param {{ refetchInterval?: number, enabled?: boolean }} options
 */
export function useAppointmentList(params = {}, options = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, params],
    queryFn:  () => listAppointments(params),
    staleTime: 0,
    refetchInterval: options.refetchInterval,
    enabled:  options.enabled !== false,
  });
}

/**
 * Fetch a single appointment by ID.
 *
 * @param {string | null | undefined} id
 */
export function useAppointment(id) {
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENT(id),
    queryFn:  () => getAppointment(id),
    enabled:  !!id,
    staleTime: 30_000,
  });
}

/**
 * Get available appointment slots for a doctor on a date.
 *
 * @param {string | null | undefined} doctorId
 * @param {string | null | undefined} date — ISO date string
 * @param {object} params — { appointment_type_id? }
 */
export function useDoctorAvailability(doctorId, date, params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.SLOTS(doctorId, date),
    queryFn:  () => getDoctorAvailability(doctorId, { date, ...params }),
    enabled:  !!(doctorId && date),
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new appointment.
 * On success: invalidates appointment list and slot availability.
 */
export function useMutationCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAppointment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
    },
  });
}

/**
 * Update appointment status (cancel, arrive, with_doctor, complete, etc.).
 * On success: invalidates appointment list and the specific record.
 */
export function useMutationUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => updateAppointmentStatus(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENT(variables.id) });
    },
  });
}

/**
 * Check in an appointment (assigns queue token, moves to checked_in).
 */
export function useMutationCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => checkInAppointment(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENT(id) });
    },
  });
}

/**
 * Reschedule an appointment.
 */
export function useMutationReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => rescheduleAppointment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
    },
  });
}

/**
 * Delete an appointment (admin only — soft delete).
 */
export function useMutationDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => deleteAppointment(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
    },
  });
}
