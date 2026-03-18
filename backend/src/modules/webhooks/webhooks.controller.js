'use strict';

const webhooksService = require('./webhooks.service');
const { n8nCallbackSchema } = require('./webhooks.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');
const logger = require('../../utils/logger');

/**
 * POST /api/v1/webhooks/n8n-callback
 *
 * Inbound callback from N8N after WhatsApp Cloud API delivery attempt.
 *
 * Authentication:
 *   NOT JWT-authenticated. This endpoint is called by N8N, not by a user.
 *   Security is enforced by X-Webhook-Secret header verification inside
 *   webhooksService.handleN8nCallback().
 *
 * Rate limiting:
 *   Covered by the globalRateLimiter applied to all routes in app.js.
 *
 * Response contract (always 200 unless body is malformed):
 *   N8N must receive 200 or it will retry the callback.
 *   On secret mismatch → 401.
 *   On Joi validation failure → 400.
 *   On notification not found → 200 with accepted: false (N8N should not retry).
 *   On any other internal error → log it, still return 200 to stop N8N retries.
 */
async function n8nCallback(req, res, next) {
  try {
    // ── Validate request body ─────────────────────────────────────────────
    const { error, value } = n8nCallbackSchema.validate(req.body, { abortEarly: false });

    if (error) {
      logger.warn('[webhooks.controller] n8n-callback received invalid body', {
        ip:     req.ip,
        errors: error.details.map((d) => d.message),
      });
      return res.status(400).json(
        errorResponse('Invalid callback payload.', error.details.map((d) => ({
          code:   'VALIDATION_ERROR',
          field:  d.context?.label || d.path?.join('.') || null,
          detail: d.message,
        })))
      );
    }

    // ── Extract webhook secret from header ───────────────────────────────
    const webhookSecret = req.headers['x-webhook-secret'];

    // ── Delegate to service ───────────────────────────────────────────────
    const result = await webhooksService.handleN8nCallback(value, webhookSecret);

    if (!result.accepted && result.message === 'Invalid webhook secret.') {
      logger.warn('[webhooks.controller] n8n-callback rejected: invalid secret', {
        ip:          req.ip,
        event_type:  value.event_type,
        hospital_id: value.hospital_id,
      });
      return res.status(401).json(
        errorResponse('Unauthorized. Invalid webhook secret.', [])
      );
    }

    // Return 200 for all other cases (including notification-not-found).
    // N8N must not retry on application-level rejections.
    return res.status(200).json(
      successResponse(result.message, {
        accepted:        result.accepted,
        notification_id: result.notification_id || value.notification_id,
        whatsapp_log_id: result.whatsapp_log_id || null,
        status_recorded: result.status_recorded || null,
      })
    );

  } catch (err) {
    // Log unexpected errors but still return 200 to prevent N8N retry loops.
    logger.error('[webhooks.controller] Unexpected error in n8n-callback handler', {
      error: err.message,
      stack: err.stack,
    });

    return res.status(200).json(
      successResponse('Callback received with internal processing error. Check server logs.', {
        accepted: false,
      })
    );
  }
}

module.exports = {
  n8nCallback,
};
