'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('doctor_schedule_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.integer('day_of_week').notNullable(); // 0=Sunday..6=Saturday
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.integer('slot_duration_minutes').notNullable().defaultTo(20);
    t.integer('max_appointments').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('doctor_schedule_settings');
