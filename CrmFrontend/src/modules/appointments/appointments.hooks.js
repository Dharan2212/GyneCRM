import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listAppointments,
  getAppointmentDetail,
  createAppointment,
  checkInAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  listAppointmentTypes,
} from './appointments.api.js'
import {
  adaptAppointmentDetail,
  adaptAppointmentListItem,
  adaptAppointmentTypeItem,
  mapAppointmentListFilters,
} from './appointments.adapters.js'

function useAsyncState(loader, dependencies, initialData, options = {}) {
  const { enabled = true } = options
  const [state, setState] = useState({ data: initialData, isLoading: Boolean(enabled), error: null })

  const load = useCallback(async () => {
    if (!enabled) {
      setState({ data: initialData, isLoading: false, error: null })
      return
    }

    setState((current) => ({ ...current, isLoading: true, error: null }))
    try {
      const data = await loader()
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      setState({ data: initialData, isLoading: false, error })
    }
  }, [enabled, ...dependencies])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

export function useAppointmentsList(filters = {}) {
  const query = useMemo(() => mapAppointmentListFilters(filters), [filters.date, filters.status, filters.page, filters.limit])

  return useAsyncState(async () => {
    const response = await listAppointments({ query })
    return {
      items: (response.items || []).map(adaptAppointmentListItem),
      meta: response.meta || null,
    }
  }, [JSON.stringify(query)], { items: [], meta: null })
}

export function useAppointmentDetail(id) {
  return useAsyncState(async () => adaptAppointmentDetail(await getAppointmentDetail({ id })), [id], null, { enabled: Boolean(id) })
}

export function useAppointmentTypes(filters = {}) {
  const query = useMemo(() => ({
    search: filters.search || undefined,
    is_active: filters.isActive ?? true,
    page: filters.page || 1,
    limit: filters.limit || 50,
  }), [filters.search, filters.isActive, filters.page, filters.limit])

  return useAsyncState(async () => {
    const response = await listAppointmentTypes({ query })
    return {
      items: (response.items || []).map(adaptAppointmentTypeItem),
      meta: response.meta || null,
    }
  }, [JSON.stringify(query)], { items: [], meta: null })
}

function useMutation(action, transform = (value) => value) {
  const [state, setState] = useState({ data: null, isLoading: false, error: null })

  const mutate = useCallback(async (payload) => {
    setState({ data: null, isLoading: true, error: null })
    try {
      const response = await action(payload)
      const data = transform(response)
      setState({ data, isLoading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, isLoading: false, error })
      throw error
    }
  }, [action, transform])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}

export function useCreateAppointmentMutation() {
  return useMutation(({ payload }) => createAppointment({ payload }), adaptAppointmentDetail)
}

export function useCheckInAppointmentMutation() {
  return useMutation(({ id }) => checkInAppointment({ id }), adaptAppointmentDetail)
}

export function useUpdateAppointmentStatusMutation() {
  return useMutation(({ id, payload }) => updateAppointmentStatus({ id, payload }), adaptAppointmentDetail)
}

export function useRescheduleAppointmentMutation() {
  return useMutation(({ id, payload }) => rescheduleAppointment({ id, payload }), (response) => ({
    oldAppointment: response?.old_appointment ? adaptAppointmentDetail(response.old_appointment) : null,
    newAppointment: response?.new_appointment ? adaptAppointmentDetail(response.new_appointment) : null,
  }))
}
