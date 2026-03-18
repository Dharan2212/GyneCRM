'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('activity_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 200).notNullable();
    t.string('module', 100).nullable();
    t.uuid('entity_id').nullable();
    t.string('entity_type', 100).nullable();
    t.jsonb('meta').nullable();
    t.string('ip_address', 50).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.raw('NOW()'));
  });
  await knex.raw('CREATE INDEX idx_activity_logs_hospital_id ON activity_logs(hospital_id)');
  await knex.raw('CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id)');
  await knex.raw('CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('activity_logs');
