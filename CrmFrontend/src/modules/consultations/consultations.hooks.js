import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getConsultationDetail,
  getConsultationFollowUp,
  getConsultationWorkspace,
  listFollowUps,
} from './consultations.api.js'
import {
  adaptConsultationDetail,
  adaptConsultationFollowUp,
  adaptConsultationWorkspace,
} from './consultations.adapters.js'

export const consultationKeys = {
  all: ['consultations'],
  detail: (id) => ['consultations', 'detail', id],
  workspace: (id) => ['consultations', 'workspace', id],
  followUp: (id) => ['consultations', 'follow-up', id],
  followUps: (query = {}) => ['consultations', 'follow-ups', query],
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

export function useConsultationDetail(id) {
  return useAsyncResource(async () => adaptConsultationDetail(await getConsultationDetail({ id })), [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function useConsultationWorkspace(id) {
  return useAsyncResource(async () => adaptConsultationWorkspace(await getConsultationWorkspace({ id })), [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function useConsultationFollowUp(id) {
  return useAsyncResource(async () => {
    try {
      return adaptConsultationFollowUp(await getConsultationFollowUp({ id }))
    } catch (error) {
      if (error?.status === 404) {
        return null
      }

      throw error
    }
  }, [id], {
    enabled: Boolean(id),
    initialData: null,
  })
}

export function useFollowUpsList(query = {}, options = {}) {
  return useAsyncResource(async () => {
    const result = await listFollowUps({ query })

    return {
      items: (result.items || []).map(adaptConsultationFollowUp),
      meta: result.meta || null,
    }
  }, [JSON.stringify(query)], {
    enabled: options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}

export function useConsultationKeys() {
  return useMemo(() => consultationKeys, [])
}
