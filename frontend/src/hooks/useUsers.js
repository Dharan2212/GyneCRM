/**
 * GyneCRM — useUsers Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useUserList(params)             — paginated/filtered user list (admin)
 *   useUser(id)                     — single user record
 *
 * Mutation hooks:
 *   useMutationCreateUser()         — POST /users
 *   useMutationUpdateUser()         — PUT /users/:id
 *   useMutationActivateUser()       — PATCH /users/:id/activate
 *   useMutationDeactivateUser()     — PATCH /users/:id/deactivate
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
} from '@services/userService';

export function useUserList(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.USERS, params],
    queryFn:  () => listUsers(params),
    staleTime: 60_000,
  });
}

export function useUser(id) {
  return useQuery({
    queryKey: QUERY_KEYS.USER(id),
    queryFn:  () => getUser(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useMutationCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}

export function useMutationUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateUser(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(variables.id) });
    },
  });
}

export function useMutationActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => activateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}

export function useMutationDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => deactivateUser(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}
