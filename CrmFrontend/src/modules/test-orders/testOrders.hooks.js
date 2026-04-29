import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPendingReviewTestOrders,
  getPendingUploadTestOrders,
  getTestOrderDetail,
  listTestOrders,
} from './testOrders.api.js'
import {
  adaptTestOrderDetail,
  adaptTestOrderItem,
  mapTestOrderFiltersToQuery,
} from './testOrders.adapters.js'

export const testOrderKeys = {
  all: ['test-orders'],
  list: (query = {}) => ['test-orders', 'list', query],
  detail: (id) => ['test-orders', 'detail', id],
  pendingUpload: (query = {}) => ['test-orders', 'pending-upload', query],
  pendingReview: (query = {}) => ['test-orders', 'pending-review', query],
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

export function useTestOrdersList(filters = {}, options = {}) {
  const query = useMemo(
    () => mapTestOrderFiltersToQuery(filters),
    [filters.patientId, filters.consultationId, filters.status, filters.page, filters.limit],
  )

  return useAsyncResource(async () => {
    const result = await listTestOrders({ query })
    return {
      items: (result.items || []).map(adaptTestOrderItem),
      meta: result.meta || null,
    }
  }, [JSON.stringify(query)], {
    enabled: options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}


export function usePendingUploadTestOrders(filters = {}, options = {}) {
  const query = useMemo(
    () => ({
      ...(filters.patientId ? { patient_id: filters.patientId } : {}),
      ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.page ? { page: filters.page } : {}),
      ...(filters.limit ? { limit: filters.limit } : {}),
    }),
    [filters.patientId, filters.status, filters.page, filters.limit],
  )

  return useAsyncResource(async () => {
    const result = await getPendingUploadTestOrders({ query })
    return {
      items: (result.items || []).map(adaptTestOrderItem),
      meta: result.meta || null,
    }
  }, [JSON.stringify(query)], {
    enabled: options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}
export function usePendingReviewTestOrders(filters = {}, options = {}) {
  const query = useMemo(
    () => ({
      ...(filters.patientId ? { patient_id: filters.patientId } : {}),
      ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.page ? { page: filters.page } : {}),
      ...(filters.limit ? { limit: filters.limit } : {}),
    }),
    [filters.patientId, filters.status, filters.page, filters.limit],
  )

  return useAsyncResource(async () => {
    const result = await getPendingReviewTestOrders({ query })
    return {
      items: (result.items || []).map(adaptTestOrderItem),
      meta: result.meta || null,
    }
  }, [JSON.stringify(query)], {
    enabled: options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}

export function useTestOrderDetail(id, options = {}) {
  return useAsyncResource(async () => adaptTestOrderDetail(await getTestOrderDetail({ id })), [id], {
    enabled: Boolean(id) && options.enabled !== false,
    initialData: null,
  })
}

export function useTestOrderKeys() {
  return useMemo(() => testOrderKeys, [])
}
