'use strict';

/**
 * Webhooks Service — N8N Callback Handler
 *
 * Processes the inbound POST /api/v1/webhooks/n8n-callback request.
 *
 * Contract (Architecture Section 4.4, Steps 27-28):
 *   N8N sends the callback after attempting WhatsApp delivery.
 *   Backend must:
 *     1. Verify X-Webhook-Secret header matches N8N_WEBHOOK_SECRET env var.
 *     2. Validate callback body shape (handled by Joi in controller before this).
 *     3. Verify notification_id exists and hospital_id matches (scoping guard).
 *     4. Update notifications.status → sent | failed (idempotent).
 *     5. Insert a new whatsapp_logs row with full delivery record.
 *     6. Return 200 to N8N regardless of partial write failures
 *        (so N8N does not retry the callback unnecessarily).
 *
 * Idempotency:
 *   N8N may retry its own callback on network failure. If the same
 *   notification_id arrives twice, we insert a second whatsapp_logs row
 *   (each delivery attempt is a separate log record) but only update
 *   notifications.status if it hasn't already been set to 'sent'.
 *   markAsSent() uses .whereIn('status', ['pending', 'failed']) guard.
 *
 * Security:
 *   X-Webhook-Secret is verified BEFORE any DB operations.
 *   If the secret is absent or incorrect, the request is rejected 401.
 *   All hospital_id values in the payload are validated against the
 *   notifications row they reference — no cross-hospital writes possible.
 *
 * Phase 6 Batch 5:
 *   - Added template_name warning log when value is present but doesn't match
 *     known template names (should not happen after validator upgrade, but kept
 *     as a belt-and-suspenders defensive log).
 *   - Explicit idempotency note in code comments for duplicate callbacks.
 *   - Status transition safety documented and verified correct.
 */

const { db }         = require('../../db/connection');
const notifRepo      = require('../notifications/notifications.repository');
const env            = require('../../config/env');
const logger         = require('../../utils/logger');
const { getValidTemplateNames } = require('../../events/template-map');

const WHATSAPP_LOGS_TABLE = 'whatsapp_logs';

/**
 * Verifies the X-Webhook-Secret header against the configured N8N secret.
 *
 * @param {string|undefined} headerValue - value of X-Webhook-Secret header
 * @returns {boolean} true if valid
 */
function verifyWebhookSecret(headerValue) {
  const expected = env.n8n.webhookSecret;

  // If no secret is configured (e.g. local dev with no env), reject to be safe
  if (!expected || expected.trim() === '') {
    logger.warn('[webhooks.service] N8N_WEBHOOK_SECRET is not configured — rejecting callback');
    return false;
  }

  return headerValue === expected;
}

/**
 * Handles the N8N delivery callback.
 *
 * Status transition safety:
 *   'sent' | 'delivered' | 'read'  → notifications.status = 'sent'
 *     (all three are positive delivery outcomes; 'sent' is the terminal success state)
 *   'failed'                        → notifications.status = 'failed'
 *   'pending'                       → no change (in-progress report; ignore)
 *
 * Idempotency:
 *   markAsSent() only updates rows WHERE status IN ('pending', 'failed').
 *   If a duplicate callback arrives after status = 'sent', the DB update
 *   is a no-op. A second whatsapp_logs row IS inserted (each attempt = 1 row).
 *
 * @param {object} callbackData  - Validated payload from n8nCallbackSchema
 * @param {string} webhookSecret - Value of X-Webhook-Secret header from request
 * @returns {Promise<{ accepted: boolean, message: string, whatsapp_log_id?: string }>}
 */
async function handleN8nCallback(callbackData, webhookSecret) {
  // ── 1. Secret verification ────────────────────────────────────────────────
  if (!verifyWebhookSecret(webhookSecret)) {
    return { accepted: false, message: 'Invalid webhook secret.' };
  }

  const {
    notification_id,
    hospital_id,
    event_type,
    recipient_phone,
    status,
    patient_id,
    whatsapp_message_id,
    template_name,
    message_body,
    failure_reason,
    n8n_workflow_id,
    branch_id,
    retry_count,
  } = callbackData;

  // ── Phase 6 Batch 5: Belt-and-suspenders template_name warning ───────────
  // The Joi validator now enforces valid template_name values, but if somehow
  // an unknown name arrives (e.g., validator bypass), log a warning.
  if (template_name && !getValidTemplateNames().has(template_name)) {
    logger.warn('[webhooks.service] Callback contains unrecognised template_name', {
      template_name,
      notification_id,
      event_type,
    });
    // Do NOT reject — N8N should not retry for an unknown template name.
    // We log, proceed, and store the unknown name as-is.
  }

  // ── 2. Verify notification exists and belongs to this hospital ────────────
  const notification = await notifRepo.findById(notification_id, hospital_id);

  if (!notification) {
    // Stale/wrong notification_id — log and accept gracefully.
    // N8N should not enter a retry loop on a bad ID.
    logger.warn('[webhooks.service] Callback received for unknown notification_id', {
      notification_id,
      hospital_id,
      event_type,
    });
    return {
      accepted: false,
      message:  `Notification ${notification_id} not found in hospital ${hospital_id}.`,
    };
  }

  // ── 3. Update notifications status ───────────────────────────────────────
  // Map WhatsApp delivery status to the notification status enum:
  //   sent | delivered | read → 'sent'   (all positive delivery outcomes)
  //   failed                 → 'failed'
  //   pending                → no change (in-progress; N8N will callback again)
  //
  // Idempotent: markAsSent() guards on WHERE status IN ('pending', 'failed'),
  // so a duplicate callback after a 'sent' row is a silent no-op.
  let notifStatusUpdate = null;

  if (['sent', 'delivered', 'read'].includes(status)) {
    notifStatusUpdate = 'sent';
  } else if (status === 'failed') {
    notifStatusUpdate = 'failed';
  }

  if (notifStatusUpdate === 'sent') {
    await notifRepo.markAsSent(notification_id, hospital_id);
  } else if (notifStatusUpdate === 'failed') {
    await notifRepo.markAsFailed(
      notification_id,
      hospital_id,
      failure_reason || 'N8N reported delivery failure.',
    );
  }

  // ── 4. Insert whatsapp_logs row (append-only) ─────────────────────────────
  // Each callback invocation = one delivery attempt record.
  // Idempotent: duplicate callbacks produce a second log row intentionally —
  // each is a separate delivery attempt with its own message_id / retry_count.
  let whatsappLogId = null;

  try {
    const [logRow] = await db(WHATSAPP_LOGS_TABLE)
      .insert({
        hospital_id,
        branch_id:           branch_id           || null,
        patient_id:          patient_id           || notification.patient_id || null,
        notification_id,
        event_type,
        // phone_number: spec-canonical column (added by migration 048).
        // recipient_phone: legacy column (from migration 042) — kept for compat.
        phone_number:        recipient_phone,
        recipient_phone:     recipient_phone,
        template_name:       template_name        || null,
        message_body:        message_body         || null,
        whatsapp_message_id: whatsapp_message_id  || null,
        n8n_workflow_id:     n8n_workflow_id       || null,
        status,
        retry_count:         retry_count          || 0,
        // error_message: spec-canonical (migration 048). failure_reason: legacy (migration 042).
        error_message:       failure_reason       || null,
        failure_reason:      failure_reason       || null,
        // Timestamps based on delivery status
        sent_at:      ['sent', 'delivered', 'read'].includes(status) ? db.fn.now() : null,
        delivered_at: status === 'delivered'                         ? db.fn.now() : null,
        read_at:      status === 'read'                              ? db.fn.now() : null,
        // Full callback stored for auditability
        payload:      callbackData,
      })
      .returning('id');

    whatsappLogId = logRow.id;

    logger.info('[webhooks.service] WhatsApp log inserted', {
      whatsappLogId,
      notification_id,
      hospital_id,
      event_type,
      template_name: template_name || null,
      status,
      retry_count,
    });
  } catch (insertErr) {
    // Log failure but do NOT fail the callback response.
    // N8N must not retry because of a log write failure.
    logger.error('[webhooks.service] Failed to insert whatsapp_log row', {
      notification_id,
      hospital_id,
      error: insertErr.message,
    });
  }

  return {
    accepted:        true,
    message:         'Callback processed.',
    whatsapp_log_id: whatsappLogId,
    notification_id,
    status_recorded: notifStatusUpdate || 'no_change',
  };
}

module.exports = {
  handleN8nCallback,
  verifyWebhookSecret,
};
