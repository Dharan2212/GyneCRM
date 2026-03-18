/**
 * GyneCRM — useDocuments Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useDocument(id)                 — single document record
 *
 * Mutation hooks:
 *   useMutationUploadDocument()     — full 3-step S3 upload + metadata creation
 *   useMutationDeleteDocument()     — DELETE /documents/:id (admin)
 *   useMutationGetDocumentUrl()     — GET /documents/:id/url (pre-signed read)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getDocumentUrl,
  getUploadUrl,
  uploadFileToS3,
  createDocument,
  deleteDocument as deleteDocumentService,
} from '@services/documentService';
import { getDocument } from '@services/documentReviewService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single document record (metadata + review status).
 *
 * @param {string | null | undefined} id
 */
export function useDocument(id) {
  return useQuery({
    queryKey: QUERY_KEYS.DOCUMENT(id),
    queryFn:  () => getDocument(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full document upload flow:
 *   1. Get pre-signed S3 upload URL
 *   2. PUT file to S3 directly
 *   3. Create document metadata record
 *
 * mutationFn receives:
 *   {
 *     file: File,
 *     patient_id: string,
 *     document_type: string,
 *     test_order_id?: string,
 *     notes?: string,
 *     onProgress?: (pct: number) => void,
 *   }
 *
 * On success: invalidates document queries for the patient.
 */
export function useMutationUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, patient_id, document_type, test_order_id, notes, onProgress }) => {
      // Step 1: Get pre-signed upload URL
      const { upload_url, s3_key } = await getUploadUrl({
        file_name:     file.name,
        file_type:     file.type,
        document_type,
        patient_id,
      });

      // Step 2: Upload directly to S3
      await uploadFileToS3(upload_url, file, onProgress);

      // Step 3: Register metadata on backend
      return createDocument({
        patient_id,
        document_type,
        s3_key,
        file_name:  file.name,
        file_size:  file.size,
        mime_type:  file.type,
        test_order_id: test_order_id || undefined,
        notes:      notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REVIEW_INBOX });
    },
  });
}

/**
 * Soft delete a document (admin only).
 */
export function useMutationDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => deleteDocumentService(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
    },
  });
}

/**
 * Get a pre-signed read URL for a document.
 * Exposed as a mutation (not a query) because it's called on demand
 * (e.g. button click to open/download), not eagerly on mount.
 *
 * Returns: { url: string, expires_in: number }
 */
export function useMutationGetDocumentUrl() {
  return useMutation({
    mutationFn: (id) => getDocumentUrl(id),
  });
}
