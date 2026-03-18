'use strict';

/**
 * Migration 047 — Fix notifications table schema
 *
 * PROBLEM:
 *   Migration 041 created the notifications table with columns that do NOT
 *   match the Phase 2 Database Architecture Specification (the locked source
 *   of truth) or the existing dispatch-event.js INSERT statements.
 *
 *   Specific mismatches:
 *     MISSING from migration 041 (required by spec + dispatcher):
 *       - entity_type   VARCHAR(100) nullable
 *       - entity_id     UUID nullable
 *       - meta          JSONB nullable default {}
 *       - error_message TEXT nullable
 *
 *     EXTRA in migration 041 (not in spec — kept as nullable for compatibility):
 *       - message_body      TEXT (originally NOT NULL — relaxed to nullable)
 *       - channel           VARCHAR(30) (originally NOT NULL — relaxed to nullable)
 *       - recipient_phone   VARCHAR(20) (originally NOT NULL — relaxed to nullable)
 *       - payload           JSONB (rename alias provided via meta — kept for compat)
 *       - failure_reason    TEXT (kept; error_message added as the spec column)
 *
 *   JOB DEDUPLICATION MISMATCH:
 *     pregnancyWeekJob.js and weeklyPregnancyTipsJob.js query:
 *       .where('reference_id', ...)         ← NOT in Phase 2 spec
 *       .whereRaw(`metadata->>'...'`, ...)  ← NOT in Phase 2 spec
 *     These are fixed in the job files to use entity_id + meta->>'...' instead.
 *     No reference_id column is added here — it is not in the spec.
 *
 * STRATEGY:
 *   - Add all missing spec columns as nullable (safe for existing rows).
 *   - Relax NOT NULL constraints on non-spec legacy columns (ALTER COLUMN).
 *   - Add indexes required by Phase 2 spec for dispatch query performance.
 *   - Never drop columns (append-only event log — backwards compat required).
 *   - notifications table is APPEND-ONLY per Phase 2 spec: no UPDATE, no DELETE.
 *
 * Authority:
 *   GyneCRM_Phase2_Database_Architecture_Specification.docx — Migration 041 section
 *   hospital_crm_architecture_v4_complete.docx — Section 21.16
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('notifications', (t) => {
    // ── Add missing spec columns ────────────────────────────────────────────

    // entity_type: the kind of record that triggered this event.
    // e.g. 'appointment', 'pregnancy', 'test_order', 'consultation'
    t.string('entity_type', 100).nullable();

    // entity_id: UUID of the triggering record. FK not enforced here because
    // the entity may live in different tables depending on entity_type.
    t.uuid('entity_id').nullable();

    // meta: JSONB event payload context. This is what dispatch-event.js writes.
    // Legacy 'payload' column is kept for backward compatibility but meta is canonical.
    t.jsonb('meta').nullable().defaultTo('{}');

    // error_message: populated by dispatcher when N8N webhook fails.
    // Legacy 'failure_reason' is kept; error_message is the spec-canonical column.
    t.text('error_message').nullable();
  });

  // ── Relax NOT NULL constraints on legacy non-spec columns ─────────────────
  // These were created as NOT NULL in migration 041 but are not in the Phase 2
  // spec. Any new INSERT by dispatch-event.js does not provide these values.
  // Making them nullable prevents INSERT failures on new rows.
  await knex.raw(`
    ALTER TABLE notifications
      ALTER COLUMN message_body     DROP NOT NULL,
      ALTER COLUMN channel          DROP NOT NULL,
      ALTER COLUMN recipient_phone  DROP NOT NULL
  `);

  // ── Add composite indexes required by Phase 2 spec ─────────────────────────
  // (patient_id, event_type, status) — event dispatch query performance
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_notif_patient_event_status
    ON notifications (patient_id, event_type, status)
  `);

  // (entity_type, entity_id) — look up all notifications for a specific record
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_notif_entity
    ON notifications (entity_type, entity_id)
    WHERE entity_type IS NOT NULL
  `);
};

exports.down = async (knex) => {
  // Drop indexes
  await knex.raw('DROP INDEX IF EXISTS idx_notif_patient_event_status');
  await knex.raw('DROP INDEX IF EXISTS idx_notif_entity');

  // Remove added columns
  await knex.schema.alterTable('notifications', (t) => {
    t.dropColumn('entity_type');
    t.dropColumn('entity_id');
    t.dropColumn('meta');
    t.dropColumn('error_message');
  });

  // Restore NOT NULL constraints on legacy columns.
  // Note: this will fail if any rows have NULL in these columns.
  // Use only in clean dev/test environments.
  await knex.raw(`
    ALTER TABLE notifications
      ALTER COLUMN message_body     SET NOT NULL,
      ALTER COLUMN channel          SET NOT NULL,
      ALTER COLUMN recipient_phone  SET NOT NULL
  `);
};
