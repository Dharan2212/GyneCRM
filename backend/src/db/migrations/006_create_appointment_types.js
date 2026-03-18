'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('appointment_types', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('name', 200).notNullable();
    t.integer('default_duration_minutes').notNullable().defaultTo(30);
    t.string('color_code', 10);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('appointment_types');
