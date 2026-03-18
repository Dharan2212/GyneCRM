/**
 * GyneCRM — useDoctors Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useDoctorList(params)              — list doctors (admin, doctor, receptionist)
 *   useDoctor(id)                      — single doctor profile
 *   useDoctorSchedule(id)              — weekly schedule settings
 *   useDoctorAvailability              — available slots (in useAppointments)
 *
 * Mutation hooks:
 *   useMutationCreateDoctor()          — POST /doctors (admin)
 *   useMutationUpdateDoctor()          — PUT /doctors/:id (admin)
 *   useMutationUpdateDoctorSchedule()  — PUT /doctors/:id/schedule (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  getDoctorSchedule,
  updateDoctorSchedule,
} from '@services/doctorService';

export function useDoctorList(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DOCTORS, params],
    queryFn:  () => listDoctors(params),
    staleTime: 120_000,
  });
}

export function useDoctor(id) {
  return useQuery({
    queryKey: QUERY_KEYS.DOCTOR(id),
    queryFn:  () => getDoctor(id),
    enabled:  !!id,
    staleTime: 120_000,
  });
}

export function useDoctorSchedule(id) {
  return useQuery({
    queryKey: QUERY_KEYS.DOCTOR_SCHEDULE(id),
    queryFn:  () => getDoctorSchedule(id),
    enabled:  !!id,
    staleTime: 300_000,
  });
}

export function useMutationCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createDoctor(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCTORS });
    },
  });
}

export function useMutationUpdateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateDoctor(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCTORS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCTOR(variables.id) });
    },
  });
}

export function useMutationUpdateDoctorSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...scheduleData }) => updateDoctorSchedule(id, scheduleData),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCTOR_SCHEDULE(variables.id) });
    },
  });
}
