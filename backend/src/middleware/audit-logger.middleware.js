'use strict';

const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * Audit Logger Middleware
 *
 * Records every state-changing operation to the activity_logs table.
 * activity_logs is append-only — rows are NEVER updated or deleted.
 *
 * Schema (from Phase 2 locked spec):
 *   id          UUID PK
 *   hospital_id UUID FK -> hospitals.id
 *   user_id     UUID FK -> users.id
 *   action      VARCHAR(200)  e.g. CREATE_PATIENT, UPDATE_APPOINTMENT
 *   module      VARCHAR(100)  e.g. patients, appointments
 *   entity_id   UUID          the record affected
 *   entity_type VARCHAR(100)
 *   meta        JSONB         additional context
 *   ip_address  VARCHAR(50)
 *   created_at  TIMESTAMPTZ DEFAULT NOW()
 *
 * Usage patterns:
 *
 * 1. Route-level middleware (automatic, for write methods):
 *    router.post('/patients', authenticate, enforceHospitalScope,
 *      auditLogger('CREATE_PATIENT', 'patients'), controller)
 *
 * 2. Service-level programmatic log (explicit, preferred for async):
 *    await appendAuditLog({ hospitalId, userId, action, module, entityId, ... })
 *
 * NOTE: Audit log failures are caught and logged but must NEVER
 * cause the main request to fail. The operation already succeeded.
 */

/**
 * appendAuditLog
 *
 * Direct INSERT into activity_logs. Fire-and-forget safe.
 * Callers may await this or not — it will not throw to the caller.
 *
 * @param {Object} params
 * @param {string} params.hospitalId
 * @param {string} params.userId
 * @param {string} params.action     - e.g. 'CREATE_PATIENT'
 * @param {string} params.module     - e.g. 'patients'
 * @param {string|null} params.entityId   - UUID of affected record
 * @param {string|null} params.entityType - e.g. 'patient'
 * @param {Object|null} params.meta  - arbitrary JSONB context
 * @param {string|null} params.ipAddress
 */
const appendAuditLog = async ({
  hospitalId,
  userId,
  action,
  module: moduleName,
  entityId = null,
  entityType = null,
  meta = null,
  ipAddress = null,
}) => {
  try {
    await db('activity_logs').insert({
      id:          uuidv4(),
      hospital_id: hospitalId,
      user_id:     userId,
      action,
      module:      moduleName,
      entity_id:   entityId,
      entity_type: entityType,
      meta:        meta ? JSON.stringify(meta) : null,
      ip_address:  ipAddress,
      created_at:  new Date(),
    });
  } catch (err) {
    logger.error(`appendAuditLog failed: ${err.message}`, {
      action,
      module: moduleName,
      entityId,
      userId,
      hospitalId,
    });
  }
};

/**
 * auditLogger(action, moduleName, options)
 *
 * Route-level middleware factory. Wraps the response so that the audit
 * log is written AFTER the controller finishes successfully (2xx only).
 *
 * entityId is read from:
 *   1. options.entityIdParam  — req.params[entityIdParam]
 *   2. options.entityIdBody   — req.body[entityIdBody]
 *   3. res.locals.auditEntityId — set by controller before res.json()
 *   4. null (fallback)
 *
 * @param {string} action      - Audit action string e.g. 'CREATE_PATIENT'
 * @param {string} moduleName  - Module name e.g. 'patients'
 * @param {Object} [options]
 * @param {string} [options.entityIdParam]  - Route param name for entity UUID
 * @param {string} [options.entityIdBody]   - Body field name for entity UUID
 * @param {string} [options.entityType]     - Explicit entity type override
 */
const auditLogger = (action, moduleName, options = {}) => {
  const { entityIdParam, entityIdBody, entityType } = options;

  return (req, res, next) => {
    // Intercept res.json to capture the response status and body
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Restore original to avoid recursion
      res.json = originalJson;

      // Fire audit log only on successful write responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Resolve entityId from multiple possible sources
        let resolvedEntityId = null;

        if (entityIdParam && req.params[entityIdParam]) {
          resolvedEntityId = req.params[entityIdParam];
        } else if (entityIdBody && req.body[entityIdBody]) {
          resolvedEntityId = req.body[entityIdBody];
        } else if (res.locals.auditEntityId) {
          resolvedEntityId = res.locals.auditEntityId;
        } else if (body && body.data && body.data.id) {
          // Attempt to extract from response envelope
          resolvedEntityId = body.data.id;
        }

        const resolvedEntityType = entityType || moduleName;

        // Non-blocking fire-and-forget
        appendAuditLog({
          hospitalId: req.hospitalId,
          userId: req.userId,
          action,
          module: moduleName,
          entityId: resolvedEntityId,
          entityType: resolvedEntityType,
          meta: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          ipAddress: req.ip || req.connection?.remoteAddress || null,
        });
      }

      return originalJson(body);
    };

    return next();
  };
};

/**
 * auditLog — compatibility shim for Phase 5 service modules.
 *
 * Phase 5 services call auditLog({ hospitalId, userId, action, entityType, entityId, meta }).
 * This shim maps that shape onto appendAuditLog, supplying a default module
 * derived from entityType.
 *
 * @param {Object} params
 */
const auditLog = (params) => appendAuditLog({
  module: params.module || params.entityType || 'system',
  ...params,
});

module.exports = {
  auditLogger,
  appendAuditLog,
  auditLog,
};
