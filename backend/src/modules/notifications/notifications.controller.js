'use strict';

const notificationsService = require('./notifications.service');
const {
  listNotificationsSchema,
  notificationIdParamSchema,
} = require('./notifications.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

/**
 * Extract actor from authenticated request.
 * Matches the pattern used in all Phase 5 controllers.
 */
function actorFromReq(req) {
  return {
    userId:     req.user.userId,
    hospitalId: req.user.hospitalId,
    role:       req.user.role,
  };
}

/**
 * Inline Joi validation helper — matching Phase 5 controller pattern.
 */
function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(
      errorResponse('Validation failed.', error.details.map((d) => ({
        code:   'VALIDATION_ERROR',
        field:  d.context?.label || d.path?.join('.') || null,
        detail: d.message,
      })))
    );
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

// ─── GET /api/v1/notifications ────────────────────────────────────────────────

/**
 * List notifications for the authenticated hospital.
 * Supports pagination and filtering by status, event_type, patient_id, dates.
 *
 * Roles: admin, doctor
 * Scope: hospital_id from JWT
 */
async function listNotifications(req, res, next) {
  try {
    const { valid, value } = validate(listNotificationsSchema, req.query, res);
    if (!valid) return;

    const result = await notificationsService.listNotifications(value, actorFromReq(req));

    return res.status(200).json(
      successResponse(
        'Notifications retrieved.',
        result.rows,
        {
          total:       result.total,
          page:        result.page,
          limit:       result.limit,
          total_pages: Math.ceil(result.total / result.limit),
        },
      )
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/notifications/failed ────────────────────────────────────────

/**
 * List the most recent failed notifications for admin retry dashboard.
 *
 * Roles: admin only
 * Scope: hospital_id from JWT
 */
async function listFailedNotifications(req, res, next) {
  try {
    const rows = await notificationsService.listFailedNotifications(actorFromReq(req));
    return res.status(200).json(successResponse('Failed notifications retrieved.', rows));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/notifications/:id ───────────────────────────────────────────

/**
 * Fetch a single notification record.
 *
 * Roles: admin, doctor
 * Scope: hospital_id from JWT
 */
async function getNotification(req, res, next) {
  try {
    const { valid } = validate(notificationIdParamSchema, req.params, res);
    if (!valid) return;

    const notification = await notificationsService.getNotificationById(
      req.params.id,
      actorFromReq(req),
    );

    return res.status(200).json(successResponse('Notification retrieved.', notification));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/notifications/:id/retry ────────────────────────────────────

/**
 * Retry a failed notification — re-dispatches the original event to N8N.
 *
 * Roles: admin only
 * Scope: hospital_id from JWT
 * Rules:
 *   - notification must exist in this hospital
 *   - notification status must be 'failed'
 *   - re-calls dispatchEvent() with original meta payload
 */
async function retryNotification(req, res, next) {
  try {
    const { valid } = validate(notificationIdParamSchema, req.params, res);
    if (!valid) return;

    const updated = await notificationsService.retryNotification(
      req.params.id,
      actorFromReq(req),
    );

    return res.status(200).json(
      successResponse('Notification queued for retry. A new dispatch has been initiated.', updated)
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/notifications/automation-status ─────────────────────────────

/**
 * GET /api/v1/notifications/automation-status
 *
 * Admin-only endpoint: returns a structured readiness report for the
 * Phase 6 automation layer.
 *
 * Checks:
 *   - N8N credential presence (base URL + webhook secret configured)
 *   - Template coverage for all patient-facing WhatsApp events
 *   - Recent notification stats (last 24h) for this hospital
 *   - All 9 core N8N workflow template entries
 *
 * Never exposes secret values. Never triggers real messages.
 *
 * Roles: admin only
 */
async function getAutomationStatus(req, res, next) {
  try {
    const report = await notificationsService.getAutomationStatus(actorFromReq(req));
    return res.status(200).json(
      successResponse(
        report.ready ? 'Automation layer is ready.' : 'Automation layer has configuration issues.',
        report,
      )
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  listFailedNotifications,
  getNotification,
  retryNotification,
  getAutomationStatus,
};
