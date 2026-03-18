'use strict';

const Joi = require('joi');
const { getValidTemplateNames } = require('../../events/template-map');

/**
 * Webhooks Module — Joi Validators
 *
 * Validates the inbound N8N callback body sent to:
 *   POST /api/v1/webhooks/n8n-callback
 *
 * N8N sends this payload after it processes a WhatsApp delivery and
 * receives the result from the WhatsApp Cloud API (Architecture Section 4.4, Step 27).
 *
 * Phase 6 Batch 5 addition:
 *   template_name is now validated against the known template names in template-map.js.
 *   If N8N sends an unknown template_name, the callback is still accepted (200) but
 *   the validator logs a warning. We use Joi .valid() with the known set — if a
 *   template_name is provided it must be one we recognise; null/empty is still allowed
 *   (some events may not use a named template).
 *
 * whatsapp_status_enum (Phase 2 locked): pending | sent | delivered | read | failed
 */

const WHATSAPP_STATUS_VALUES = ['pending', 'sent', 'delivered', 'read', 'failed'];

/**
 * Build the set of valid template_name values from the locked template-map.
 * Computed once at module load — template-map is static.
 */
const VALID_TEMPLATE_NAMES = Array.from(getValidTemplateNames());

/**
 * Inbound callback from N8N after WhatsApp delivery attempt.
 *
 * Required fields:
 *   notification_id  — UUID of the notifications row this delivery belongs to
 *   hospital_id      — UUID for scoping validation (must match notification's hospital)
 *   event_type       — locked event constant string
 *   recipient_phone  — phone number that was messaged
 *   status           — whatsapp_status_enum value
 *
 * Optional fields:
 *   patient_id           — UUID (null for system events)
 *   whatsapp_message_id  — Meta Cloud API message ID (present on success)
 *   template_name        — Meta-approved template name — validated against template-map
 *   message_body         — final rendered message text
 *   failure_reason       — error description from WhatsApp/N8N (present on failure)
 *   n8n_workflow_id      — N8N workflow identifier for traceability
 *   branch_id            — UUID of the branch whose WhatsApp number was used
 *   retry_count          — number of times N8N retried before this result (0-3)
 */
const n8nCallbackSchema = Joi.object({
  notification_id:     Joi.string().uuid().required(),
  hospital_id:         Joi.string().uuid().required(),
  event_type:          Joi.string().max(100).required(),
  recipient_phone:     Joi.string().max(20).required(),
  status:              Joi.string().valid(...WHATSAPP_STATUS_VALUES).required(),

  // Optional delivery details
  patient_id:          Joi.string().uuid().allow(null, '').default(null),

  whatsapp_message_id: Joi.string().max(500).allow(null, '').default(null),

  // Phase 6 Batch 5: template_name validated against locked template-map values.
  // Allows null/empty (some system events have no named template).
  // If a non-null value is provided, it must match a known template name.
  template_name:       Joi.string()
    .valid(...VALID_TEMPLATE_NAMES)
    .allow(null, '')
    .default(null)
    .messages({
      'any.only': `template_name must be one of the known Meta-approved template names: ${VALID_TEMPLATE_NAMES.join(', ')}`,
    }),

  message_body:        Joi.string().max(4096).allow(null, '').default(null),
  failure_reason:      Joi.string().max(1000).allow(null, '').default(null),
  n8n_workflow_id:     Joi.string().max(200).allow(null, '').default(null),
  branch_id:           Joi.string().uuid().allow(null, '').default(null),
  retry_count:         Joi.number().integer().min(0).max(10).default(0),
});

module.exports = {
  n8nCallbackSchema,
  WHATSAPP_STATUS_VALUES,
  VALID_TEMPLATE_NAMES,
};
