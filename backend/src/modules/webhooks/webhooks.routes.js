'use strict';

/**
 * Webhooks Routes — /api/v1/webhooks
 *
 * Inbound endpoints called by N8N automation engine.
 * NOT JWT-authenticated — N8N is a system caller, not a logged-in user.
 * Security is enforced by X-Webhook-Secret header verification in the service.
 *
 * Routes:
 *   POST /n8n-callback  — N8N delivery status callback (Architecture Section 4.4, Step 27)
 *
 * CORS note:
 *   app.js already sets `allowedOrigins` and permits requests with no
 *   browser origin (Postman, N8N). No additional CORS config required here.
 *
 * Future Phase 6 batches may add additional webhook endpoints here for:
 *   - Inbound WhatsApp message replies (feedback collection workflow)
 *   - N8N health ping / workflow status notifications
 */

const express    = require('express');
const router     = express.Router();
const controller = require('./webhooks.controller');

// ── POST /api/v1/webhooks/n8n-callback ────────────────────────────────────────
// No authenticate / enforceHospitalScope — this is a system-to-system call.
// X-Webhook-Secret is verified inside webhooksService.handleN8nCallback().
router.post('/n8n-callback', controller.n8nCallback);

module.exports = router;
