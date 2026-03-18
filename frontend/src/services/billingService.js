/**
 * GyneCRM — Billing Service
 * Phase 8.1 — Domain Service Layer
 *
 * Backend module: /api/v1/invoices
 * Verified routes:
 *   GET    /invoices                    — list invoices (admin, receptionist)
 *   POST   /invoices                    — create invoice
 *   GET    /invoices/:id                — get invoice detail
 *   PUT    /invoices/:id                — update invoice (draft)
 *   POST   /invoices/:id/items          — add line item
 *   DELETE /invoices/:id/items/:itemId  — remove line item
 *   POST   /invoices/:id/finalize       — finalize invoice
 *   POST   /invoices/:id/payments       — record payment
 *   POST   /invoices/:id/refund         — refund (admin only)
 *   POST   /invoices/:id/void           — void (admin only)
 *   GET    /invoices/:id/pdf            — get invoice PDF
 */

import apiClient from './apiClient';
import { API_ENDPOINTS } from '@constants';

/**
 * List invoices with optional filters.
 * @param {{ patient_id?, status?, date_from?, date_to?, branch_id?, page?, limit? }} params
 */
export async function listInvoices(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.INVOICES.LIST, { params });
  return response.data.data;
}

/**
 * Get invoice detail by ID.
 * @param {string} id
 */
export async function getInvoice(id) {
  const response = await apiClient.get(API_ENDPOINTS.INVOICES.DETAIL(id));
  return response.data.data;
}

/**
 * Create a new invoice.
 * @param {object} data — { patient_id, appointment_id?, notes? }
 */
export async function createInvoice(data) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.CREATE, data);
  return response.data.data;
}

/**
 * Update a draft invoice.
 * @param {string} id
 * @param {object} updates — { discount?, notes?, tax_rate? }
 */
export async function updateInvoice(id, updates) {
  const response = await apiClient.put(API_ENDPOINTS.INVOICES.UPDATE(id), updates);
  return response.data.data;
}

/**
 * Add a line item to an invoice.
 * @param {string} id — invoice ID
 * @param {object} item — { service_catalog_id?, description, quantity, unit_price }
 */
export async function addInvoiceItem(id, item) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.ITEMS(id), item);
  return response.data.data;
}

/**
 * Remove a line item from an invoice.
 * @param {string} id — invoice ID
 * @param {string} itemId
 */
export async function removeInvoiceItem(id, itemId) {
  const response = await apiClient.delete(API_ENDPOINTS.INVOICES.ITEM(id, itemId));
  return response.data;
}

/**
 * Finalize an invoice (locks for payment).
 * @param {string} id
 */
export async function finalizeInvoice(id) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.FINALIZE(id));
  return response.data.data;
}

/**
 * Record a payment against an invoice.
 * @param {string} id
 * @param {{ amount: number, payment_mode: string, reference_number?: string, notes?: string }} data
 */
export async function recordPayment(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.PAYMENTS(id), data);
  return response.data.data;
}

/**
 * Refund an invoice (admin only).
 * @param {string} id
 * @param {{ amount: number, reason: string }} data
 */
export async function refundInvoice(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.REFUND(id), data);
  return response.data.data;
}

/**
 * Void an invoice (admin only, draft/pending only).
 * @param {string} id
 * @param {{ reason: string }} data
 */
export async function voidInvoice(id, data) {
  const response = await apiClient.post(API_ENDPOINTS.INVOICES.VOID(id), data);
  return response.data.data;
}

/**
 * Get a pre-signed S3 URL for the invoice PDF.
 * @param {string} id
 * @returns {Promise<{ url: string, expires_in: number }>}
 */
export async function getInvoicePdf(id) {
  const response = await apiClient.get(API_ENDPOINTS.INVOICES.PDF(id));
  return response.data.data;
}
