'use strict';

/**
 * Migration 048 — Fix whatsapp_logs table schema
 *
 * PROBLEM:
 *   Migration 042 created whatsapp_logs with columns that partially mismatch
 *   the Phase 2 Database Architecture Specification.
 *
 *   MISSING from migration 042 (required by spec):
 *     - retry_count     INTEGER NOT NULL DEFAULT 0
 *     - template_name   VARCHAR(200) nullable
 *     - error_message   TEXT nullable (spec uses this; migration has failure_reason)
 *     - phone_number    VARCHAR(20) (spec uses phone_number; migration has recipient_phone)
 *
 *   NOTE on column naming:
 *     The spec uses 'phone_number' but migration 042 used 'recipient_phone'.
 *     We ADD phone_number as the canonical column and keep recipient_phone for
 *     backward compatibility. The webhook callback handler will write phone_number.
 *
 *     The spec uses 'error_message' but migration 042 used 'failure_reason'.
 *     We ADD error_message and keep failure_reason nullable for compat.
 *
 * STRATEGY:
 *   - Add all missing columns.
 *   - Never drop existing columns (delivery log — append-only per Phase 2 spec).
 *   - whatsapp_logs is APPEND-ONLY: no UPDATE, no DELETE for any role.
 *
 * Authority:
 *   GyneCRM_Phase2_Database_Architecture_Specification.docx — Migration 042 section
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('whatsapp_logs', (t) => {
    // retry_count: number of times N8N retried this message.
    // Required by spec. N8N sends this value in the callback payload.
    t.integer('retry_count').notNullable().defaultTo(0);

    // template_name: the Meta-approved WhatsApp template name used.
    // e.g. 'appointment_confirmation', 'reminder_24h', 'pregnancy_milestone'
    t.string('template_name', 200).nullable();

    // phone_number: spec-canonical column name. Migration used 'recipient_phone'.
    // Callback handler writes to phone_number; recipient_phone kept for compat.
    t.string('phone_number', 20).nullable();

    // error_message: spec-canonical column name. Migration used 'failure_reason'.
    // Callback handler writes to error_message; failure_reason kept for compat.
    t.text('error_message').nullable();
  });

  // Index on notification_id for fast callback lookup when updating status
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_notification_id
    ON whatsapp_logs (notification_id)
    WHERE notification_id IS NOT NULL
  `);

  // Index for retry queue and delivery reports (arch spec 4.5 requirement)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status_created
    ON whatsapp_logs (status, created_at)
  `);
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS idx_whatsapp_logs_notification_id');
  await knex.raw('DROP INDEX IF EXISTS idx_whatsapp_logs_status_created');

  await knex.schema.alterTable('whatsapp_logs', (t) => {
    t.dropColumn('retry_count');
    t.dropColumn('template_name');
    t.dropColumn('phone_number');
    t.dropColumn('error_message');
  });
};
