'use strict';
/**
 * Migration 044 — override_logs
 * APPEND-ONLY. Records every field-level change to finalized clinical records.
 * One row per changed field per override operation.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('override_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('entity_type', 100).notNullable();
    t.uuid('entity_id').notNullable();
    t.string('field_changed', 200).notNullable();
    t.text('old_value').nullable();
    t.text('new_value').nullable();
    t.text('override_reason').notNullable();
    t.text('override_note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.raw('NOW()'));
  });
  await knex.raw('CREATE INDEX idx_override_logs_hospital_id ON override_logs(hospital_id)');
  await knex.raw('CREATE INDEX idx_override_logs_entity ON override_logs(entity_type, entity_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('override_logs');
