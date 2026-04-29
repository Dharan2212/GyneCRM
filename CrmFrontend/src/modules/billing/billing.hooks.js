import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addInvoiceItems,
  createInvoice,
  finalizeInvoice,
  getInvoiceDetail,
  getInvoicePdf,
  listInvoices,
  recordInvoicePayment,
  sendInvoice,
  updateInvoice,
} from './billing.api.js'
import {
  adaptInvoiceDetail,
  adaptInvoiceListItem,
  adaptInvoicePdfFoundation,
  mapInvoiceFiltersToQuery,
} from './billing.adapters.js'

export const billingKeys = {
  all: ['billing'],
  invoices: (query = {}) => ['billing', 'invoices', query],
  invoiceDetail: (id) => ['billing', 'invoice', id],
}

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

export function useInvoicesList(filters = {}) {
  const query = useMemo(() => mapInvoiceFiltersToQuery(filters), [filters.search, filters.status, filters.page, filters.limit, filters.patient_id])

  return useAsyncState(async () => {
    const response = await listInvoices({ query })
    return {
      items: (response.items || []).map(adaptInvoiceListItem),
      meta: response.meta || null,
    }
  }, [JSON.stringify(query)], { items: [], meta: null })
}

export function useInvoiceDetail(id) {
  return useAsyncState(async () => adaptInvoiceDetail(await getInvoiceDetail({ id })), [id], null, { enabled: Boolean(id) })
}

export function useCreateInvoiceMutation() {
  return useMutation(({ payload }) => createInvoice({ payload }), adaptInvoiceDetail)
}

export function useUpdateInvoiceMutation() {
  return useMutation(({ id, payload }) => updateInvoice({ id, payload }), adaptInvoiceDetail)
}

export function useAddInvoiceItemsMutation() {
  return useMutation(({ id, payload }) => addInvoiceItems({ id, payload }), adaptInvoiceDetail)
}

export function useFinalizeInvoiceMutation() {
  return useMutation(({ id }) => finalizeInvoice({ id, payload: {} }), adaptInvoiceDetail)
}

export function useRecordInvoicePaymentMutation() {
  return useMutation(({ id, payload }) => recordInvoicePayment({ id, payload }), adaptInvoiceDetail)
}

export function useSendInvoiceMutation() {
  return useMutation(({ id, payload }) => sendInvoice({ id, payload }), adaptInvoiceDetail)
}

export function useInvoicePdfFoundationMutation() {
  return useMutation(({ id }) => getInvoicePdf({ id }), adaptInvoicePdfFoundation)
}

export function useBillingKeys() {
  return useMemo(() => billingKeys, [])
}
