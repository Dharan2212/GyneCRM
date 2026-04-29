import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPrescriptionDetail } from './prescriptions.api.js'
import { adaptPrescriptionDetail } from './prescriptions.adapters.js'

export const prescriptionKeys = {
  all: ['prescriptions'],
  detail: (id) => ['prescriptions', 'detail', id],
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

export function usePrescriptionDetail(id, options = {}) {
  return useAsyncResource(async () => adaptPrescriptionDetail(await getPrescriptionDetail({ id })), [id], {
    enabled: Boolean(id) && options.enabled !== false,
    initialData: null,
  })
}

export function usePrescriptionKeys() {
  return useMemo(() => prescriptionKeys, [])
}
