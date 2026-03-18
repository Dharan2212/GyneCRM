'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('appointment_type_resources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('appointment_type_id').notNullable().references('id').inTable('appointment_types').onDelete('CASCADE');
    t.uuid('resource_id').notNullable().references('id').inTable('clinic_resources').onDelete('CASCADE');
    t.boolean('is_required').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('appointment_type_resources');
