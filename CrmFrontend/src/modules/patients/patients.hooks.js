import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPatientCategoryCounts,
  getPatientCategoryHistory,
  getPatientDetail,
  getPatientHub,
  listPatients,
  registerPatient,
} from './patients.api.js'
import {
  adaptPatientCategoryCounts,
  adaptPatientCategoryHistory,
  adaptPatientDetail,
  adaptPatientHub,
  adaptPatientListItem,
  adaptRegisteredPatient,
  mapPatientFilterToQuery,
} from './patients.adapters.js'

export const patientKeys = {
  all: ['patients'],
  list: (query = {}) => ['patients', 'list', query],
  detail: (id) => ['patients', 'detail', id],
  hub: (id) => ['patients', 'hub', id],
  categoryHistory: (id) => ['patients', 'category-history', id],
  categoryCounts: (query = {}) => ['patients', 'category-counts', query],
}

function useAsyncResource(loader, dependencies, options = {}) {
  const { enabled = true, initialData = null } = options
  const [state, setState] = useState({
    data: initialData,
    isLoading: Boolean(enabled),
    error: null,
  })

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

  return {
    ...state,
    reload: load,
  }
}

export function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [delay, value])

  return debouncedValue
}

export function usePatientsList(filters = {}) {
  const query = useMemo(() => mapPatientFilterToQuery(filters), [filters.search, filters.category, filters.page, filters.limit])

  return useAsyncResource(async () => {
    const result = await listPatients({ query })
    return {
      items: (result.items || []).map(adaptPatientListItem),
      meta: result.meta || null,
    }
  }, [JSON.stringify(query)], { initialData: { items: [], meta: null } })
}

export function usePatientDetail(id) {
  return useAsyncResource(async () => adaptPatientDetail(await getPatientDetail({ id })), [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function usePatientHub(id) {
  return useAsyncResource(async () => adaptPatientHub(await getPatientHub({ id })), [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function usePatientCategoryHistory(id, options = {}) {
  return useAsyncResource(async () => adaptPatientCategoryHistory(await getPatientCategoryHistory({ id })), [id], {
    enabled: Boolean(id) && options.enabled !== false,
    initialData: [],
  })
}

export function usePatientCategoryCounts(query = {}, options = {}) {
  return useAsyncResource(async () => adaptPatientCategoryCounts(await getPatientCategoryCounts({ query })), [JSON.stringify(query)], {
    enabled: options.enabled !== false,
    initialData: { total: 0, pregnancy: 0, ivf: 0, gynac: 0, uncategorized: 0 },
  })
}

export function useRegisterPatientMutation() {
  const [state, setState] = useState({
    data: null,
    raw: null,
    isLoading: false,
    error: null,
  })

  const register = useCallback(async (payload) => {
    setState({ data: null, raw: null, isLoading: true, error: null })

    try {
      const created = await registerPatient({ payload })
      setState({
        data: adaptRegisteredPatient(created),
        raw: created,
        isLoading: false,
        error: null,
      })
      return created
    } catch (error) {
      setState({ data: null, raw: null, isLoading: false, error })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, raw: null, isLoading: false, error: null })
  }, [])

  return {
    ...state,
    register,
    reset,
  }
}

export function usePatientKeys() {
  return useMemo(() => patientKeys, [])
}
