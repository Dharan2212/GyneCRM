/**
 * GyneCRM — useDocumentReviews Hooks
 * Phase 8.1 — Query & Mutation Hook Layer
 *
 * Read hooks:
 *   useReviewInbox(params)          — pending review inbox list
 *   useDocument(id)                 — single document record (from useDocuments)
 *
 * Mutation hooks:
 *   useMutationReviewDocument()     — POST /documents/:id/review
 *   useMutationFlagDocument()       — POST /documents/:id/flag
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants';
import {
  getReviewInbox,
  reviewDocument,
  flagDocument,
} from '@services/documentReviewService';

// ─────────────────────────────────────────────────────────────────────────────
// Read Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the doctor review inbox.
 * Returns documents with pending_review status.
 *
 * @param {{ document_type?, severity?, page?, limit? }} params
 */
export function useReviewInbox(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REVIEW_INBOX, params],
    queryFn:  () => getReviewInbox(params),
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a review for a document.
 * On success: invalidates review inbox and the document record.
 */
export function useMutationReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => reviewDocument(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REVIEW_INBOX });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENT(variables.id) });
    },
  });
}

/**
 * Flag a document as abnormal with severity.
 * On success: invalidates review inbox and the document record.
 */
export function useMutationFlagDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => flagDocument(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REVIEW_INBOX });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENT(variables.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
    },
  });
}
