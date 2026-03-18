/**
 * GyneCRM — useBilling Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useInvoiceList(params)          — filtered invoice list
 *   useInvoice(id)                  — single invoice with items and payments
 *
 * Mutation hooks:
 *   useMutationCreateInvoice()      — POST /invoices
 *   useMutationUpdateInvoice()      — PUT /invoices/:id
 *   useMutationAddInvoiceItem()     — POST /invoices/:id/items
 *   useMutationRemoveInvoiceItem()  — DELETE /invoices/:id/items/:itemId
 *   useMutationFinalizeInvoice()    — POST /invoices/:id/finalize
 *   useMutationRecordPayment()      — POST /invoices/:id/payments
 *   useMutationRefundInvoice()      — POST /invoices/:id/refund (admin)
 *   useMutationVoidInvoice()        — POST /invoices/:id/void (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  finalizeInvoice,
  recordPayment,
  refundInvoice,
  voidInvoice,
} from '@services/billingService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List invoices with optional filters.
 *
 * @param {{ patient_id?, status?, date_from?, date_to?, branch_id?, page?, limit? }} params
 */
export function useInvoiceList(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICES, params],
    queryFn:  () => listInvoices(params),
    staleTime: 30_000,
  });
}

/**
 * Fetch a single invoice by ID.
 *
 * @param {string | null | undefined} id
 */
export function useInvoice(id) {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICE(id),
    queryFn:  () => getInvoice(id),
    enabled:  !!id,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useMutationCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

export function useMutationUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateInvoice(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.id) });
    },
  });
}

export function useMutationAddInvoiceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, item }) => addInvoiceItem(invoiceId, item),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.invoiceId) });
    },
  });
}

export function useMutationRemoveInvoiceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, itemId }) => removeInvoiceItem(invoiceId, itemId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.invoiceId) });
    },
  });
}

export function useMutationFinalizeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => finalizeInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

export function useMutationRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...data }) => recordPayment(invoiceId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.invoiceId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

export function useMutationRefundInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => refundInvoice(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

export function useMutationVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => voidInvoice(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}
