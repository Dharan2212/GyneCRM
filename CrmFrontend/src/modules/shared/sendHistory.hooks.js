import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPatientSendHistory } from './sendHistory.api.js'
import { adaptSendHistoryItem } from './sendHistory.adapters.js'

export const sendHistoryKeys = {
  all: ['send-history'],
  patient: (patientId, query = {}) => ['send-history', 'patient', patientId, query],
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

  return { ...state, reload: load }
}

export function usePatientSendHistory(patientId, query = {}, options = {}) {
  const safeQuery = useMemo(() => ({
    ...(query.page ? { page: query.page } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
    ...(query.sourceType ? { source_type: query.sourceType } : {}),
  }), [query.page, query.limit, query.sourceType])

  return useAsyncResource(async () => {
    const result = await getPatientSendHistory({ patientId, query: safeQuery })
    return {
      items: (result.items || []).map(adaptSendHistoryItem),
      meta: result.meta || null,
    }
  }, [patientId, JSON.stringify(safeQuery)], {
    enabled: Boolean(patientId) && options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}

export function useSendHistoryKeys() {
  return useMemo(() => sendHistoryKeys, [])
}
