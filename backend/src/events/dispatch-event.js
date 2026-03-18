'use strict';

/**
 * dispatchEvent — GyneCRM central automation event dispatcher.
 *
 * Responsibilities:
 *   1. Validates eventType against the locked 20-event catalogue.
 *   2. Checks whatsapp_communication consent for patient-facing events.
 *   3. Inserts a notifications row (mutable-status model, Phase 2 locked).
 *   4. Fires the N8N webhook asynchronously (fire-and-forget).
 *      - Dispatch failure MUST NOT break the calling API request.
 *   5. Updates notifications.status to 'sent' | 'failed' | 'suppressed'.
 *
 * Authority:
 *   - GyneCRM Master Development Roadmap Section 3.4
 *   - Phase 2 DB Spec: notifications table, patient_consents table (locked columns)
 *   - Phase 3 lock decisions: Joi validation, stateless JWT, no refresh_tokens table
 */

const EVENT_TYPES  = require('./event-types');
const logger       = require('../utils/logger');
const { db }       = require('../db/connection');   // ← named export { db } from Batch 1
const env          = require('../config/env');       // ← nested config object from Batch 1

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Fast O(1) lookup set of all valid event type values. */
const VALID_EVENT_SET = new Set(Object.values(EVENT_TYPES));

/**
 * Events that send patient-facing WhatsApp messages via N8N.
 * These MUST pass a whatsapp_communication consent check before dispatch.
 * If no current consent, notification is logged as 'suppressed'; N8N is NOT called.
 *
 * Non-patient events (DOCTOR_UNAVAILABILITY_APPLIED, TEST_ORDER_CREATED, etc.)
 * are excluded from this set — they route to staff channels, not patient WhatsApp.
 */
const PATIENT_WHATSAPP_EVENTS = new Set([
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
]);

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Converts SCREAMING_SNAKE event type to kebab-case for N8N webhook slug.
 * e.g. APPOINTMENT_REMINDER_24H → appointment-reminder-24h
 *
 * @param {string} eventType
 * @returns {string}
 */
function eventTypeToWebhookSlug(eventType) {
  return eventType.toLowerCase().replace(/_/g, '-');
}

/**
 * Builds the full N8N webhook URL for a given event type.
 * Pattern: {n8n.baseUrl}/webhook/{event-slug}
 *
 * Uses env.n8n.baseUrl from the nested Batch 1 config object.
 *
 * @param {string} eventType
 * @returns {string}
 */
function buildWebhookUrl(eventType) {
  const base = (env.n8n.baseUrl || '').replace(/\/$/, '');
  const slug  = eventTypeToWebhookSlug(eventType);
  return `${base}/webhook/${slug}`;
}

/**
 * Checks whether the patient has a current active whatsapp_communication consent.
 *
 * Consent model (Phase 2 locked, append-only):
 *   Each consent give or withdrawal is a NEW row. The effective consent state
 *   is determined by the most recent row per (patient_id, consent_type).
 *   Consent is active only if that row has status = 'given'.
 *
 * Schema columns used:
 *   patient_consents.patient_id, patient_consents.hospital_id,
 *   patient_consents.consent_type, patient_consents.status,
 *   patient_consents.created_at
 *
 * @param {string} patientId
 * @param {string} hospitalId
 * @returns {Promise<boolean>}
 */
async function hasWhatsappConsent(patientId, hospitalId) {
  const row = await db('patient_consents')
    .where({
      patient_id:   patientId,
      hospital_id:  hospitalId,
      consent_type: 'whatsapp_communication',
    })
    .orderBy('created_at', 'desc')
    .select('status')
    .first();

  return row ? row.status === 'given' : false;
}

/**
 * Inserts a new row into notifications with status = 'pending'.
 * Returns the UUID of the new row for subsequent status updates.
 *
 * Schema columns used (Phase 2 locked):
 *   notifications.hospital_id    VARCHAR required
 *   notifications.patient_id     UUID nullable (null for system events)
 *   notifications.event_type     VARCHAR(100) required
 *   notifications.entity_type    VARCHAR(100) nullable
 *   notifications.entity_id      UUID nullable
 *   notifications.status         notification_status_enum (pending → sent|failed|suppressed)
 *   notifications.meta           JSONB (event payload context)
 *   notifications.created_at     auto
 *
 * @param {object} params
 * @returns {Promise<string>} notificationId UUID
 */
async function insertNotificationPending({ hospitalId, patientId, eventType, entityType, entityId, meta }) {
  const [row] = await db('notifications')
    .insert({
      hospital_id:  hospitalId,
      patient_id:   patientId  || null,
      event_type:   eventType,
      entity_type:  entityType || null,
      entity_id:    entityId   || null,
      status:       'pending',
      meta:         meta       || {},
      // sent_at and error_message left as DB default NULL — set on status update
    })
    .returning('id');

  // pg driver returns array of objects: [{ id: 'uuid...' }]
  return row.id;
}

/**
 * Updates notification status to 'sent' and records sent_at timestamp.
 *
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
async function markNotificationSent(notificationId) {
  await db('notifications')
    .where({ id: notificationId })
    .update({
      status:  'sent',
      sent_at: db.fn.now(),
    });
}

/**
 * Updates notification status to 'failed' with the error message.
 *
 * @param {string} notificationId
 * @param {string} errorMessage
 * @returns {Promise<void>}
 */
async function markNotificationFailed(notificationId, errorMessage) {
  await db('notifications')
    .where({ id: notificationId })
    .update({
      status:        'failed',
      error_message: String(errorMessage).slice(0, 1000),
    });
}

/**
 * Updates notification status to 'suppressed'.
 * Used when consent check blocks a patient-facing WhatsApp event.
 *
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
async function markNotificationSuppressed(notificationId) {
  await db('notifications')
    .where({ id: notificationId })
    .update({ status: 'suppressed' });
}

/**
 * Fires the N8N webhook and updates the notification status.
 *
 * This is the fire-and-forget async operation. It is intentionally called
 * without await by dispatchEvent(). All errors are caught internally.
 * They MUST NOT propagate to the caller under any circumstances.
 *
 * Versioned Webhook Envelope (Architecture Section 21.16):
 *   {
 *     event_name:      string,   // e.g. "APPOINTMENT_CREATED" — locked event constant
 *     event_version:   number,   // integer schema version — 1 for all current events
 *     hospital_id:     string,   // UUID — multi-tenant scoping key for N8N routing
 *     branch_id:       string|null, // UUID — present when event is branch-specific
 *     entity_type:     string|null, // e.g. "appointment", "pregnancy", "test_order"
 *     entity_id:       string|null, // UUID of the primary record affected
 *     actor_user_id:   string|null, // UUID of the user who triggered the mutation
 *     occurred_at:     string,   // ISO 8601 UTC timestamp
 *     notification_id: string,   // UUID — for N8N to correlate callback
 *     data:            object,   // event-specific payload fields
 *   }
 *
 * N8N must validate event_version before processing data. If version is
 * unsupported, N8N must fail gracefully and alert admin (arch Section 21.16).
 *
 * Uses env.n8n.webhookSecret from the nested Batch 1 config object.
 *
 * @param {string} notificationId
 * @param {string} eventType
 * @param {object} payload
 * @param {string} hospitalId
 * @returns {Promise<void>}
 */
async function fireAndForgetWebhook(notificationId, eventType, payload, hospitalId) {
  const webhookUrl = buildWebhookUrl(eventType);

  // ── Extract envelope-level fields from payload ─────────────────────────
  // These fields are promoted to the top-level versioned envelope.
  // Everything else goes into data{} as the event-specific payload.
  const {
    patientId,       // already extracted by dispatchEvent for consent gate
    entityType,
    entityId,
    branchId   = null,
    actorUserId = null,
    // event_version may be explicitly set by the caller; default 1
    event_version: callerVersion,
    ...eventData     // all remaining fields become the data{} object
  } = payload;

  const envelope = {
    event_name:      eventType,
    event_version:   callerVersion || 1,
    hospital_id:     hospitalId,
    branch_id:       branchId,
    entity_type:     entityType || null,
    entity_id:       entityId   || null,
    actor_user_id:   actorUserId,
    occurred_at:     new Date().toISOString(),
    notification_id: notificationId,
    data:            eventData,
  };

  try {
    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Webhook-Secret': env.n8n.webhookSecret || '',
      },
      body:   JSON.stringify(envelope),
      signal: AbortSignal.timeout(10_000), // 10-second hard timeout; N8N is async anyway
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)');
      throw new Error(`N8N HTTP ${response.status}: ${body}`);
    }

    await markNotificationSent(notificationId);

    logger.info({
      msg:            'Event dispatched to N8N successfully',
      eventType,
      hospitalId,
      notificationId,
      webhookUrl,
      event_version:  envelope.event_version,
    });
  } catch (err) {
    logger.error({
      msg:            'Event dispatch to N8N failed (fire-and-forget caught)',
      eventType,
      hospitalId,
      notificationId,
      webhookUrl,
      error:          err.message,
    });

    try {
      await markNotificationFailed(notificationId, err.message);
    } catch (dbErr) {
      // Log DB failure but absolutely do not throw — this is a nested safety net
      logger.error({
        msg:            'Failed to update notification to failed status',
        notificationId,
        error:          dbErr.message,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Dispatches a system automation event to N8N and logs it to notifications.
 *
 * Locked behaviour contract (Phase 3):
 *   1. eventType is validated against the 20-event locked catalogue. Throws on invalid.
 *   2. payload must be a non-null plain object. Throws if not.
 *   3. hospitalId is required for hospital scoping. Throws if absent.
 *   4. For patient-facing WhatsApp events (patientId must be in payload):
 *        - Queries patient_consents for most-recent whatsapp_communication row.
 *        - No 'given' consent → notification inserted as 'suppressed', N8N NOT called.
 *   5. Notification row inserted with status = 'pending'.
 *   6. N8N webhook fired asynchronously (fire-and-forget, no await in caller).
 *        - Success  → notifications.status = 'sent', sent_at = NOW()
 *        - Failure  → notifications.status = 'failed', error_message populated
 *   7. dispatchEvent() returns immediately after step 5. The API response is
 *      never delayed by N8N availability.
 *
 * Required payload fields (all events):
 *   - patientId  {string|null}  UUID — null for system-only events (e.g. TEST_OVERDUE on non-patient entities)
 *   - entityType {string|null}  e.g. 'appointment', 'pregnancy' — maps to notifications.entity_type
 *   - entityId   {string|null}  UUID of the triggering record — maps to notifications.entity_id
 *   - ...other event-specific fields stored in notifications.meta JSONB
 *
 * Throws synchronously for programming errors only (invalid args). Never throws for
 * network/DB failures encountered during async dispatch.
 *
 * @param {string} eventType  - One of the 20 locked EVENT_TYPES constants
 * @param {object} payload    - Must include { patientId?, entityType?, entityId?, ...eventData }
 * @param {string} hospitalId - UUID of the hospital (REQUIRED, enforces tenant scoping)
 * @returns {Promise<void>}
 */
async function dispatchEvent(eventType, payload, hospitalId) {
  // ── Argument validation (programming errors — safe to throw) ─────────────
  if (!eventType || !VALID_EVENT_SET.has(eventType)) {
    throw new Error(
      `dispatchEvent: Invalid eventType "${eventType}". ` +
      `Must be one of the 20 locked EVENT_TYPES constants.`
    );
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(
      `dispatchEvent: payload must be a non-null plain object. Received: ${typeof payload}`
    );
  }

  if (!hospitalId) {
    throw new Error('dispatchEvent: hospitalId is required for tenant scoping.');
  }

  // ── Extract standard notification fields from payload ────────────────────
  const { patientId = null, entityType = null, entityId = null } = payload;

  // ── Consent gate for patient-facing WhatsApp events ──────────────────────
  if (PATIENT_WHATSAPP_EVENTS.has(eventType) && patientId) {
    let consentGranted = false;

    try {
      consentGranted = await hasWhatsappConsent(patientId, hospitalId);
    } catch (consentErr) {
      // Consent query failure: fail-closed (treat as no consent), log and continue
      logger.error({
        msg:       'Consent check query failed in dispatchEvent — treating as no consent',
        eventType,
        patientId,
        hospitalId,
        error:     consentErr.message,
      });
    }

    if (!consentGranted) {
      logger.info({
        msg:       'Event suppressed: no active whatsapp_communication consent',
        eventType,
        patientId,
        hospitalId,
      });

      // Still insert the row for full audit trail (suppressed state is informative)
      try {
        const notificationId = await insertNotificationPending({
          hospitalId,
          patientId,
          eventType,
          entityType,
          entityId,
          meta: payload,
        });
        await markNotificationSuppressed(notificationId);
      } catch (suppressErr) {
        logger.error({
          msg:   'Failed to log suppressed notification',
          error: suppressErr.message,
        });
      }

      return; // Do not dispatch to N8N
    }
  }

  // ── Insert notification (pending) ────────────────────────────────────────
  let notificationId;

  try {
    notificationId = await insertNotificationPending({
      hospitalId,
      patientId,
      eventType,
      entityType,
      entityId,
      meta: payload,
    });
  } catch (insertErr) {
    // Cannot proceed without a notification row — log and abort silently
    logger.error({
      msg:       'Failed to insert pending notification in dispatchEvent — aborting dispatch',
      eventType,
      hospitalId,
      error:     insertErr.message,
    });
    return;
  }

  // ── Fire webhook asynchronously — must not block caller ─────────────────
  // void + .catch() is the safety net for any unexpected synchronous throw
  // inside fireAndForgetWebhook (all intentional errors are already caught within it)
  void fireAndForgetWebhook(notificationId, eventType, payload, hospitalId).catch((unexpectedErr) => {
    logger.error({
      msg:            'Unexpected uncaught error in fireAndForgetWebhook',
      notificationId,
      eventType,
      error:          unexpectedErr.message,
    });
  });

  // Return immediately — caller is never blocked by N8N availability
}

module.exports = { dispatchEvent };
