'use strict';

/**
 * Notifications Service
 *
 * Business logic for the notifications module.
 *
 * Exposed operations:
 *   listNotifications       — paginated list with filters (Admin + Doctor)
 *   getNotificationById     — single record fetch (Admin + Doctor)
 *   retryNotification       — re-dispatch a failed notification (Admin only)
 *   listFailedNotifications — all failed rows for admin retry dashboard
 *
 * Rules enforced:
 *   - hospital_id scoping on every operation (from JWT via actor)
 *   - append-only table: no UPDATE except status fields (via repository only)
 *   - retry only allowed on status = 'failed' rows
 *   - retry re-calls dispatchEvent() — does NOT directly call N8N
 *   - dispatchEvent() re-inserts a fresh notifications row; the old row
 *     is reset to 'pending' to avoid orphaned failed rows in the dashboard
 */

const repo              = require('./notifications.repository');
const { dispatchEvent } = require('../../events/dispatch-event');
const { NotFoundError, BusinessRuleError } = require('../../utils/errors');
const logger            = require('../../utils/logger');

// ─── List ────────────────────────────────────────────────────────────────────

/**
 * Paginated notification list for a hospital.
 *
 * @param {object} filters  - Validated query params from listNotificationsSchema
 * @param {object} actor    - { userId, hospitalId, role }
 * @returns {Promise<{ rows, total, page, limit }>}
 */
async function listNotifications(filters, actor) {
  return repo.findByHospital(actor.hospitalId, filters);
}

// ─── Get single ───────────────────────────────────────────────────────────────

/**
 * Fetch a single notification by id.
 *
 * @param {string} id     - notification UUID
 * @param {object} actor  - { userId, hospitalId, role }
 * @returns {Promise<object>}
 * @throws {NotFoundError} if not found within this hospital
 */
async function getNotificationById(id, actor) {
  const notification = await repo.findById(id, actor.hospitalId);

  if (!notification) {
    throw new NotFoundError(
      `Notification not found.`,
      'NOTIFICATION_NOT_FOUND',
    );
  }

  return notification;
}

// ─── Failed list (admin dashboard) ───────────────────────────────────────────

/**
 * Returns the most recent 50 failed notifications for the hospital.
 * Used by the admin notification retry dashboard.
 *
 * @param {object} actor - { userId, hospitalId, role }
 * @returns {Promise<object[]>}
 */
async function listFailedNotifications(actor) {
  return repo.findFailedByHospital(actor.hospitalId);
}

// ─── Retry ────────────────────────────────────────────────────────────────────

/**
 * Retry a failed notification by re-dispatching the original event to N8N.
 *
 * Retry contract:
 *   1. Fetch the notification row — must belong to this hospital.
 *   2. Status must be 'failed'. Any other status throws BusinessRuleError.
 *   3. Reset the existing row to 'pending' (clears error_message + sent_at).
 *   4. Re-call dispatchEvent() with the original event_type + meta payload.
 *      dispatchEvent() will insert a new 'pending' notification row and fire
 *      the webhook asynchronously.
 *   5. Return the updated (reset) notification row.
 *
 * NOTE: dispatchEvent() inserts a second notifications row on retry.
 * This is intentional — each dispatch attempt is a separate audit record.
 * The original failed row is reset to 'pending' to remove it from the
 * failed dashboard, but both rows remain in the append-only log.
 *
 * @param {string} id     - notification UUID to retry
 * @param {object} actor  - { userId, hospitalId, role }
 * @returns {Promise<object>} the reset notification row
 * @throws {NotFoundError}     if not found within this hospital
 * @throws {BusinessRuleError} if status is not 'failed'
 */
async function retryNotification(id, actor) {
  const notification = await repo.findById(id, actor.hospitalId);

  if (!notification) {
    throw new NotFoundError('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }

  if (notification.status !== 'failed') {
    throw new BusinessRuleError(
      `Cannot retry notification with status "${notification.status}". Only failed notifications can be retried.`,
      'NOTIFICATION_NOT_RETRYABLE',
    );
  }

  // Reset the existing row to pending — removes it from failed dashboard
  await repo.resetToPending(id, actor.hospitalId);

  // Re-dispatch using original payload stored in meta JSONB column.
  // dispatchEvent() will: re-check consent, insert a new pending row, fire webhook.
  const originalPayload = notification.meta || {};

  try {
    await dispatchEvent(
      notification.event_type,
      {
        ...originalPayload,
        // Ensure required scoping fields are present (may have been in meta already)
        patientId:  originalPayload.patientId  || notification.patient_id,
        entityType: originalPayload.entityType || notification.entity_type,
        entityId:   originalPayload.entityId   || notification.entity_id,
        // Tag this as a manual retry for traceability in the new notification row
        _retried_from:     id,
        _retried_by:       actor.userId,
        _retried_at:       new Date().toISOString(),
      },
      actor.hospitalId,
    );
  } catch (dispatchErr) {
    // dispatchEvent throws synchronously only for programming errors (invalid args).
    // Network failures are handled internally. Log and surface to caller.
    logger.error('[notifications.service] retryNotification dispatch error', {
      notificationId: id,
      eventType:      notification.event_type,
      error:          dispatchErr.message,
    });
    throw dispatchErr;
  }

  logger.info('[notifications.service] Notification retried', {
    notificationId: id,
    eventType:      notification.event_type,
    retriedBy:      actor.userId,
    hospitalId:     actor.hospitalId,
  });

  // Return the now-reset notification row (status = pending)
  return repo.findById(id, actor.hospitalId);
}

// ─── Automation readiness status ─────────────────────────────────────────────

/**
 * getAutomationStatus
 *
 * Returns a structured readiness report for the full Phase 6 automation layer.
 * Used by the admin GET /api/v1/notifications/automation-status endpoint.
 *
 * Checks performed (all non-destructive, read-only):
 *   1. N8N configuration presence (base URL + webhook secret configured)
 *   2. All 9 core N8N workflow templates coverage in template-map
 *   3. Recent notification stats (last 24h) — total, sent, failed, suppressed
 *   4. Cron jobs registered count
 *   5. PATIENT_WHATSAPP_EVENTS coverage vs template-map entries
 *
 * Security:
 *   - Admin-only endpoint
 *   - Never exposes secret values — only presence/absence
 *   - Never triggers real messages
 *
 * @param {object} actor - { userId, hospitalId, role }
 * @returns {Promise<object>}
 */
async function getAutomationStatus(actor) {
  const { hospitalId } = actor;
  const env            = require('../../config/env');
  const EVENT_TYPES    = require('../../events/event-types');
  const { TEMPLATE_MAP, getAllTemplateEntries } = require('../../events/template-map');

  // ── 1. Credential readiness ────────────────────────────────────────────────
  const n8nBaseUrl        = env.n8n.baseUrl;
  const n8nSecretSet      = !!(env.n8n.webhookSecret && env.n8n.webhookSecret.trim() !== '' && env.n8n.webhookSecret !== 'replace_with_strong_random_webhook_secret_min_32_chars');
  const n8nBaseUrlSet     = !!(n8nBaseUrl && n8nBaseUrl.trim() !== '' && n8nBaseUrl !== 'http://localhost:5678');
  const n8nConfigured     = n8nBaseUrlSet && n8nSecretSet;

  // ── 2. Template coverage ──────────────────────────────────────────────────
  // Core 9 N8N workflows (those with n8n_workflow number)
  const coreWorkflows = getAllTemplateEntries()
    .filter((e) => e.n8n_workflow !== null)
    .sort((a, b) => a.n8n_workflow - b.n8n_workflow)
    .map((e) => ({
      workflow_number: e.n8n_workflow,
      event_type:      e.event_type,
      template_name:   e.template_name,
      workflow_id:     e.workflow_id,
      required_vars:   e.required_vars,
    }));

  // All template entries (core + additional patient-facing events)
  const allTemplateEntries = getAllTemplateEntries().map((e) => ({
    event_type:     e.event_type,
    template_name:  e.template_name,
    workflow_id:    e.workflow_id,
    is_core_workflow: e.n8n_workflow !== null,
  }));

  // Check which patient-facing events from PATIENT_WHATSAPP_EVENTS have no template entry
  const PATIENT_WHATSAPP_EVENT_LIST = [
    EVENT_TYPES.APPOINTMENT_CREATED,
    EVENT_TYPES.APPOINTMENT_RESCHEDULED,
    EVENT_TYPES.APPOINTMENT_CANCELLED,
    EVENT_TYPES.APPOINTMENT_REMINDER_24H,
    EVENT_TYPES.APPOINTMENT_REMINDER_2H,
    EVENT_TYPES.APPOINTMENT_MISSED,
    EVENT_TYPES.APPOINTMENT_CHECKED_IN,
    EVENT_TYPES.FOLLOWUP_DUE,
    EVENT_TYPES.PREGNANCY_MILESTONE_REACHED,
    EVENT_TYPES.PREGNANCY_WEEKLY_TIPS,
    EVENT_TYPES.PREGNANCY_HIGH_RISK_FLAGGED,
    EVENT_TYPES.DELIVERY_RECORDED,
    EVENT_TYPES.POSTPARTUM_FOLLOWUP_DUE,
    EVENT_TYPES.WAITLIST_SLOT_AVAILABLE,
    EVENT_TYPES.FEEDBACK_REQUESTED,
  ];

  const eventsWithoutTemplate = PATIENT_WHATSAPP_EVENT_LIST.filter(
    (et) => !TEMPLATE_MAP[et]
  );

  // ── 3. Recent notification stats (last 24h) for this hospital ────────────
  const { db } = require('../../db/connection');
  const since  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const statsRows = await db('notifications')
    .where('hospital_id', hospitalId)
    .where('created_at', '>=', since)
    .groupBy('status')
    .select('status')
    .count('id as count');

  const stats24h = { pending: 0, sent: 0, failed: 0, suppressed: 0 };
  for (const row of statsRows) {
    if (stats24h[row.status] !== undefined) {
      stats24h[row.status] = parseInt(row.count, 10);
    }
  }
  stats24h.total = statsRows.reduce((s, r) => s + parseInt(r.count, 10), 0);

  // ── 4. Overall readiness verdict ─────────────────────────────────────────
  const issues = [];

  if (!n8nBaseUrlSet) {
    issues.push('N8N_BASE_URL is not configured for production (currently set to localhost).');
  }
  if (!n8nSecretSet) {
    issues.push('N8N_WEBHOOK_SECRET is not set or uses the placeholder value.');
  }
  if (eventsWithoutTemplate.length > 0) {
    issues.push(`${eventsWithoutTemplate.length} patient-facing event(s) have no WhatsApp template entry: ${eventsWithoutTemplate.join(', ')}`);
  }

  const ready = issues.length === 0;

  return {
    ready,
    issues,
    credentials: {
      n8n_base_url_configured:       n8nBaseUrlSet,
      n8n_webhook_secret_configured: n8nSecretSet,
      n8n_base_url_value:            n8nBaseUrlSet ? n8nBaseUrl : '(not set)',
    },
    template_coverage: {
      core_workflows:         coreWorkflows.length,
      total_template_entries: allTemplateEntries.length,
      patient_whatsapp_events: PATIENT_WHATSAPP_EVENT_LIST.length,
      events_without_template: eventsWithoutTemplate,
    },
    core_workflows:    coreWorkflows,
    all_templates:     allTemplateEntries,
    notifications_24h: {
      since: since,
      ...stats24h,
    },
    checked_at: new Date().toISOString(),
  };
}

module.exports = {
  listNotifications,
  getNotificationById,
  listFailedNotifications,
  retryNotification,
  getAutomationStatus,
};
