'use strict';

/**
 * Notifications Repository
 *
 * Handles all DB interactions for the notifications table.
 *
 * APPEND-ONLY CONTRACT (Phase 2 DB Spec):
 *   The notifications table is an append-only event log.
 *   NO UPDATE of any field except status, sent_at, error_message.
 *   NO DELETE of any row for any role.
 *   All writes that are not status updates go through dispatch-event.js.
 *
 * Hospital-scoped: every query filters by hospital_id.
 * Parameterized queries only — no string interpolation.
 */

const { db } = require('../../db/connection');

const TABLE = 'notifications';

// ─── Read operations ──────────────────────────────────────────────────────────

/**
 * Find a single notification by id within a hospital scope.
 *
 * @param {string} id         - UUID
 * @param {string} hospitalId - UUID
 * @returns {Promise<object|null>}
 */
async function findById(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .first();
}

/**
 * Paginated list of notifications with optional filters.
 * Returns { rows, total, page, limit }.
 *
 * @param {string} hospitalId
 * @param {object} filters
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @param {string} [filters.sort_by='created_at']
 * @param {string} [filters.sort_dir='desc']
 * @param {string} [filters.status]
 * @param {string} [filters.event_type]
 * @param {string} [filters.patient_id]
 * @param {string} [filters.entity_type]
 * @param {string} [filters.date_from]
 * @param {string} [filters.date_to]
 * @returns {Promise<{ rows: object[], total: number, page: number, limit: number }>}
 */
async function findByHospital(hospitalId, filters = {}) {
  const {
    page      = 1,
    limit     = 20,
    sort_by   = 'created_at',
    sort_dir  = 'desc',
    status,
    event_type,
    patient_id,
    entity_type,
    date_from,
    date_to,
  } = filters;

  const buildQuery = () => {
    const q = db(TABLE)
      .where('hospital_id', hospitalId);

    if (status)      q.where('status', status);
    if (event_type)  q.where('event_type', event_type);
    if (patient_id)  q.where('patient_id', patient_id);
    if (entity_type) q.where('entity_type', entity_type);
    if (date_from)   q.where('created_at', '>=', date_from);
    if (date_to)     q.where('created_at', '<=', date_to);

    return q;
  };

  const [countResult, rows] = await Promise.all([
    buildQuery().count('id as count').first(),
    buildQuery()
      .select(
        'id',
        'hospital_id',
        'patient_id',
        'event_type',
        'entity_type',
        'entity_id',
        'status',
        'meta',
        'error_message',
        'sent_at',
        'created_at',
      )
      .orderBy(sort_by, sort_dir)
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  return {
    rows,
    total: parseInt(countResult.count, 10),
    page,
    limit,
  };
}

/**
 * Find all failed notifications for a hospital.
 * Used by the admin retry dashboard.
 *
 * @param {string} hospitalId
 * @param {number} [limit=50]
 * @returns {Promise<object[]>}
 */
async function findFailedByHospital(hospitalId, limit = 50) {
  return db(TABLE)
    .where({ hospital_id: hospitalId, status: 'failed' })
    .select(
      'id',
      'patient_id',
      'event_type',
      'entity_type',
      'entity_id',
      'meta',
      'error_message',
      'created_at',
    )
    .orderBy('created_at', 'desc')
    .limit(limit);
}

// ─── Write operations (status updates only — append-only table) ───────────────

/**
 * Update notification status to 'sent' and set sent_at timestamp.
 * Called by the N8N callback handler on successful delivery.
 *
 * @param {string} id         - notification UUID
 * @param {string} hospitalId - scoping guard
 * @returns {Promise<number>} rows updated (0 or 1)
 */
async function markAsSent(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .whereIn('status', ['pending', 'failed']) // only update if not already terminal
    .update({
      status:     'sent',
      sent_at:    db.fn.now(),
      updated_at: db.fn.now(),
    });
}

/**
 * Update notification status to 'failed' with error message.
 * Called by the N8N callback handler on delivery failure.
 *
 * @param {string} id           - notification UUID
 * @param {string} hospitalId   - scoping guard
 * @param {string} errorMessage - failure description from N8N
 * @returns {Promise<number>} rows updated
 */
async function markAsFailed(id, hospitalId, errorMessage) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId })
    .whereNot('status', 'sent') // never downgrade a confirmed sent notification
    .update({
      status:        'failed',
      error_message: String(errorMessage).slice(0, 1000),
      updated_at:    db.fn.now(),
    });
}

/**
 * Reset notification status to 'pending' for retry.
 * Called by the admin retry endpoint before re-dispatching.
 * Clears error_message so the next attempt starts clean.
 *
 * @param {string} id         - notification UUID
 * @param {string} hospitalId - scoping guard
 * @returns {Promise<number>} rows updated
 */
async function resetToPending(id, hospitalId) {
  return db(TABLE)
    .where({ id, hospital_id: hospitalId, status: 'failed' }) // only retry failed rows
    .update({
      status:        'pending',
      error_message: null,
      sent_at:       null,
      updated_at:    db.fn.now(),
    });
}

module.exports = {
  findById,
  findByHospital,
  findFailedByHospital,
  markAsSent,
  markAsFailed,
  resetToPending,
};
