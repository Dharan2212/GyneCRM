'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('protocol_message_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('protocol_id').notNullable().references('id').inTable('hospital_protocols').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('event_type', 100).notNullable();
    t.integer('trigger_week').nullable();
    t.string('language', 10).notNullable().defaultTo('en');
    t.text('template_body').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('protocol_message_templates');
