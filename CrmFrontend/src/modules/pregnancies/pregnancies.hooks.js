import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPregnancyDetail,
  getPregnancyMilestones,
} from './pregnancies.api.js'
import {
  adaptPregnancyDetail,
  adaptPregnancyMilestone,
} from './pregnancies.adapters.js'

export const pregnancyKeys = {
  all: ['pregnancies'],
  detail: (id) => ['pregnancies', 'detail', id],
  milestones: (id) => ['pregnancies', 'milestones', id],
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

export function usePregnancyDetail(id) {
  return useAsyncResource(async () => adaptPregnancyDetail(await getPregnancyDetail({ id })), [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function usePregnancyMilestones(id, options = {}) {
  return useAsyncResource(async () => {
    const milestones = await getPregnancyMilestones({ id })
    return (milestones || []).map(adaptPregnancyMilestone)
  }, [id], {
    enabled: Boolean(id) && options.enabled !== false,
    initialData: [],
  })
}

export function usePregnancyKeys() {
  return useMemo(() => pregnancyKeys, [])
}
