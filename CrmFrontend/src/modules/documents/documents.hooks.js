import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createDocument,
  getDocumentReviewInbox,
  getDocumentUploadUrl,
  getDocumentUrl,
} from './documents.api.js'
import {
  adaptDocumentItem,
  adaptUploadUrlFoundation,
} from './documents.adapters.js'

export const documentKeys = {
  all: ['documents'],
  reviewInbox: (query = {}) => ['documents', 'review-inbox', query],
  detailUrl: (id) => ['documents', 'url', id],
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

function useAsyncMutation(executor) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const run = useCallback(async (...args) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await executor(...args)
      setData(result)
      return result
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [executor])

  return { data, isLoading, error, reset, run }
}

export function useDocumentReviewInbox(query = {}, options = {}) {
  const safeQuery = useMemo(() => ({
    ...(query.patientId ? { patient_id: query.patientId } : {}),
    ...(query.reviewStatus ? { review_status: query.reviewStatus } : {}),
    ...(query.page ? { page: query.page } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  }), [query.patientId, query.reviewStatus, query.page, query.limit])

  return useAsyncResource(async () => {
    const result = await getDocumentReviewInbox({ query: safeQuery })
    return {
      items: (result.items || []).map(adaptDocumentItem),
      meta: result.meta || null,
    }
  }, [JSON.stringify(safeQuery)], {
    enabled: options.enabled !== false,
    initialData: { items: [], meta: null },
  })
}

export function useUploadUrlFoundationMutation() {
  const mutation = useAsyncMutation(async (payload) => adaptUploadUrlFoundation(await getDocumentUploadUrl({ payload })))
  return {
    ...mutation,
    requestFoundation: mutation.run,
  }
}

export function useCreateDocumentMutation() {
  const mutation = useAsyncMutation(async (payload) => adaptDocumentItem(await createDocument({ payload })))
  return {
    ...mutation,
    create: mutation.run,
  }
}

export function useDocumentAccessFoundationMutation() {
  const mutation = useAsyncMutation(async (documentId) => adaptUploadUrlFoundation(await getDocumentUrl({ id: documentId })))
  return {
    ...mutation,
    requestAccess: mutation.run,
  }
}

export function useDocumentKeys() {
  return useMemo(() => documentKeys, [])
}
